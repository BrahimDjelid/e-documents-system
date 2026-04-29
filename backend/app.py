from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = Flask(__name__)
CORS(app, supports_credentials=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_PATH = os.path.join(BASE_DIR, "data/users.json")


# ----------------------------
# Helpers
# ----------------------------

def load_users():
    try:
        with open(USERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def save_users(data):
    with open(USERS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def extract_user_id():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    if not token.startswith("token-"):
        return None
    return token.replace("token-", "")


def compute_compliance(tax_records):
    # Informational only — used for UI display, never for request validation or approval logic.
    # Source of truth is always the taxRecords array; this function just summarises it.
    if not tax_records:
        return False
    return all(
        (r["paidPrincipal"] + r["paidPenalties"]) >= (r["principal"] + r["penalties"])
        for r in tax_records
    )


# ----------------------------
# 🆕 C20 PDF GENERATOR (ADDED)
# ----------------------------

def generate_c20(user_obj, request_id):
    DOCS_DIR = os.path.join(BASE_DIR, "documents")
    os.makedirs(DOCS_DIR, exist_ok=True)

    filename = os.path.join(DOCS_DIR, f"{request_id}.pdf")

    # ✅ CACHE
    if os.path.exists(filename):
        return filename
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    # header left
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, height - 40,  "REPUBLIQUE ALGERIENNE")
    c.drawString(40, height - 55,  "DEMOCRATIQUE ET POPULAIRE")
    c.drawString(40, height - 80,  "MINISTERE DES FINANCES")
    c.drawString(40, height - 95,  "DIRECTION GENERALE")
    c.drawString(40, height - 110, "DES IMPOTS")

    # header right
    c.setFont("Helvetica", 10)
    c.drawString(width - 160, height - 40, "Serie C  n 20")

    # title
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 150, "CERTIFICAT")
    c.line(width / 2 - 80, height - 160, width / 2 + 80, height - 160)

    profile = user_obj["profile"]
    full_name = f"{profile['firstName']} {profile['lastName']}"
    nif = user_obj["auth"]["id"]

    y = height - 220
    c.setFont("Helvetica", 11)
    c.drawString(40, y, "Certifie que M.")
    c.drawString(140, y, full_name)
    c.line(140, y - 2, 400, y - 2)

    y -= 40
    c.drawString(40, y, "N.I.F :")
    box_x = 100
    for digit in nif:
        c.rect(box_x, y - 10, 12, 12)
        c.drawCentredString(box_x + 6, y - 8, digit)
        box_x += 14

    y -= 40
    c.drawString(40, y, "Demeurant a :")
    y -= 20
    for _ in range(6):
        c.line(40, y, width - 40, y)
        y -= 15

    y -= 30
    c.drawString(40, y, "A : ..............................")
    c.drawString(250, y, "Le : ..............................")
    y -= 40
    c.drawString(40, y, "Signature:")

    c.save()
    return filename

def generate_extrait_role(user_obj, request_id):
    DOCS_DIR = os.path.join(BASE_DIR, "documents")
    os.makedirs(DOCS_DIR, exist_ok=True)

    filename = os.path.join(DOCS_DIR, f"{request_id}_extrait.pdf")

    # ✅ CACHE (do not regenerate)
    if os.path.exists(filename):
        return filename

    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    profile = user_obj.get("profile", {})
    tax = user_obj.get("taxInfo", {})
    records = tax.get("taxRecords", [])

    full_name = f"{profile.get('firstName','')} {profile.get('lastName','')}"
    nif = user_obj["auth"]["id"]
    address = tax.get("businessAddress", "N/A")
    activity = tax.get("mainActivity", {}).get("activityName", "N/A")

    top = height - 40

    # HEADER
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, top, "REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE")
    c.drawString(40, top - 15, "MINISTERE DES FINANCES")
    c.drawString(40, top - 30, "DIRECTION GENERALE DES IMPOTS")

    c.drawRightString(width - 40, top - 15, "RECETTE DES IMPOTS")
    c.drawRightString(width - 40, top - 30, "EXTRAIT DES ROLES")

    c.line(40, top - 35, width - 40, top - 35)

    # IDENTIFICATION BOX
    box_x = 40
    box_w = width - 80
    box_h = 85
    box_y = top - 130

    c.setLineWidth(2)
    c.rect(box_x, box_y, box_w, box_h)

    c.setFont("Helvetica-Bold", 11)
    c.drawString(box_x + 12, box_y + box_h - 18, "IDENTIFICATION DU CONTRIBUABLE")

    c.setFont("Helvetica", 10)
    y = box_y + box_h - 40
    c.drawString(box_x + 12, y, f"NIF: {nif}")
    c.drawString(box_x + 250, y, f"Nom: {full_name}")

    y -= 18
    c.drawString(box_x + 12, y, f"Adresse: {address}")

    y -= 18
    c.drawString(box_x + 12, y, f"Activité: {activity}")

    # TABLE
    gap = 25
    table_top = box_y - gap

    row_h = 25
    columns = [
        ("Année", 60),
        ("Principal", 90),
        ("Pénalités", 90),
        ("Payé Principal", 100),
        ("Payé Pénalités", 110),
        ("Reste dû", 80),
    ]

    num_rows = max(len(records), 1) + 2  # + total row
    table_h = num_rows * row_h
    table_y = table_top - table_h
    table_x = 40
    table_w = width - 80

    c.setLineWidth(2)
    c.rect(table_x, table_y, table_w, table_h)

    c.setLineWidth(1)

    # vertical lines
    x = table_x
    for _, w in columns:
        c.line(x, table_y, x, table_y + table_h)
        x += w
    c.line(x, table_y, x, table_y + table_h)

    # horizontal
    for i in range(num_rows + 1):
        y = table_y + i * row_h
        c.line(table_x, y, table_x + table_w, y)

    # header row
    c.setFont("Helvetica-Bold", 9)
    x = table_x + 5
    y = table_y + table_h - 17
    for title, w in columns:
        c.drawString(x, y, title)
        x += w

    # data
    c.setFont("Helvetica", 9)
    y -= row_h

    totals = [0, 0, 0, 0]

    for r in records:
        principal = r["principal"]
        penalties = r["penalties"]
        paid_p = r["paidPrincipal"]
        paid_pen = r["paidPenalties"]

        reste = (principal + penalties) - (paid_p + paid_pen)

        totals[0] += principal
        totals[1] += penalties
        totals[2] += paid_p
        totals[3] += paid_pen

        values = [r["year"], principal, penalties, paid_p, paid_pen, reste]

        x = table_x + 5
        for i, v in enumerate(values):
            c.drawString(x, y, str(v))
            x += columns[i][1]

        y -= row_h

    # TOTAL ROW
    total_reste = (totals[0] + totals[1]) - (totals[2] + totals[3])

    c.setFont("Helvetica-Bold", 9)
    values = ["TOTAL", totals[0], totals[1], totals[2], totals[3], total_reste]

    x = table_x + 5
    for i, v in enumerate(values):
        c.drawString(x, y, str(v))
        x += columns[i][1]

    # FOOTER
    footer_y = table_y - 40
    c.setFont("Helvetica", 10)
    c.drawString(40, footer_y, "Certifié exact")
    c.drawString(40, footer_y - 20, "Le Receveur des Impôts")

    c.save()
    return filename

# ----------------------------
# Routes
# ----------------------------

@app.route("/")
def home():
    return {"message": "Flask backend running"}


@app.route("/api/test-users")
def test():
    return jsonify(load_users())


# ----------------------------
# LOGIN
# ----------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    user_id = data.get("id")
    password = data.get("password")

    users = load_users()

    user = next(
        (u for u in users if u["auth"]["id"] == user_id and u["auth"]["password"] == password),
        None
    )

    if not user:
        return {"error": "Incorrect credentials"}, 401

    return {
        "token": f"token-{user_id}",
        "userId": user["auth"]["id"],
        "role": user["role"],
        "userFirstName": user.get("profile", {}).get("firstName", ""),
        "userLastName": user.get("profile", {}).get("lastName", ""),
        "service": user.get("service") if user["role"] == "admin" else None
    }


# ----------------------------
# GET CURRENT USER
# ----------------------------

@app.route("/api/user/me", methods=["GET"])
def me():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user:
        return {"error": "User not found"}, 404

    return user


# ----------------------------
# SUBMIT REQUEST
# ----------------------------

@app.route("/api/requests", methods=["POST"])
def submit_request():
    try:
        user_id = extract_user_id()
        if not user_id:
            return {"error": "Unauthorized"}, 401

        data = request.get_json()
        users = load_users()

        user = next((u for u in users if u["auth"]["id"] == user_id), None)
        if not user:
            return {"error": "User not found"}, 404

        # VALIDATION
        if not user["eligibility"]["identityVerified"]:
            return {"error": "Identity not verified"}, 400

        if user["taxInfo"]["taxIdentificationNumber"] != user_id:
            return {"error": "NIF mismatch"}, 400

        if data["documentType"] == "Extrait de rôle":
            if not data.get("taxRecords"):
                return {"error": "Tax records required"}, 400

        # CREATE REQUEST
        new_request = {
            "requestId": data["requestId"],
            "documentType": data["documentType"],
            "status": "pending",
            "submittedAt": data["submittedAt"],
            "note": ""
        }

        # Persist the fiscal year for C20 requests
        if data["documentType"] == "C20" and data.get("year"):
            new_request["year"] = data["year"]

        user.setdefault("requests", []).append(new_request)

        # ADMIN NOTIFICATION
        admin = next(
            (u for u in users if u["role"] == "admin" and u["service"] == data["documentType"]),
            None
        )

        if admin:
            notif = {
                "id": f"NOTIF-NEW-REQUEST-{data['requestId']}",
                "type": "new_request",
                "message": f"New {data['documentType']} request from {data['applicant']['fullName']}.",
                "requestId": data["requestId"],
                "read": False,
                "deleted": False,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }

            admin.setdefault("notifications", []).append(notif)

        save_users(users)

        return {
            "requestId": data["requestId"],
            "status": "pending",
            "submittedAt": data["submittedAt"]
        }

    except Exception as e:
        print("Submit error:", e)
        return {"error": "Server error"}, 500


# ----------------------------
# ADMIN — GET REQUESTS
# ----------------------------

@app.route("/api/requests", methods=["GET"])
def get_requests():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()
    admin = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not admin or admin["role"] != "admin":
        return {"error": "Forbidden"}, 403

    service = admin.get("service")
    result = []

    for user in users:
        if user["role"] != "user":
            continue

        profile = user.get("profile", {})
        tax = user.get("taxInfo", {})

        for req in user.get("requests", []):
            if req["documentType"] != service:
                continue

            result.append({
                **req,
                "_fullName": f"{profile.get('firstName','')} {profile.get('lastName','')}".strip(),
                "_nif": user["auth"]["id"],
                "_dob": profile.get("dateOfBirth"),
                "_phone": profile.get("phone"),
                "_email": profile.get("email"),
                "_taxRegime": tax.get("taxRegime"),
                "_taxRecords": tax.get("taxRecords", [])
            })

    return result


# ----------------------------
# ADMIN — DASHBOARD
# ----------------------------

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():
    user_id = extract_user_id()
    users = load_users()
    admin = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not admin or admin["role"] != "admin":
        return {"error": "Forbidden"}, 403

    service = admin.get("service")
    result = []

    for user in users:
        if user["role"] != "user":
            continue

        profile = user.get("profile", {})
        tax = user.get("taxInfo", {})

        for req in user.get("requests", []):
            if req["documentType"] != service:
                continue

            result.append({
                **req,
                "_fullName": f"{profile.get('firstName','')} {profile.get('lastName','')}".strip(),
                "_taxRecords": tax.get("taxRecords", [])
            })

    return result


# ----------------------------
# ADMIN — DECISION
# ----------------------------

@app.route("/api/requests/<request_id>/decision", methods=["POST"])
def save_decision(request_id):
    user_id = extract_user_id()
    data = request.get_json()

    users = load_users()
    admin = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not admin or admin["role"] != "admin":
        return {"error": "Forbidden"}, 403

    for user in users:
        for req in user.get("requests", []):
            if req["requestId"] == request_id:
                new_status = data.get("status")
                doc_type = req.get("documentType", "document")

                req["status"] = new_status
                req["note"] = data.get("note", "")
                req["processedBy"] = data.get("processedBy")

                # Map status to correct notification type
                notif_type_map = {
                    "approved": "request_approved",
                    "rejected": "request_rejected",
                    "pending": "new_request"
                }
                notif_type = notif_type_map.get(new_status, "new_request")

                # Build human-readable message
                if new_status == "approved":
                    message = f"Your {doc_type} request has been approved."
                elif new_status == "rejected":
                    message = f"Your {doc_type} request has been rejected."
                else:
                    message = f"Your {doc_type} request status was updated to {new_status}."

                user.setdefault("notifications", []).append({
                    "id": f"NOTIF-{notif_type.upper()}-{request_id}",
                    "type": notif_type,
                    "message": message,
                    "requestId": request_id,
                    "read": False,
                    "deleted": False,
                    "createdAt": datetime.utcnow().isoformat() + "Z"
                })

                save_users(users)
                return {"requestId": request_id, "status": req["status"]}

    return {"error": "Request not found"}, 404


# ----------------------------
# DOCUMENT DOWNLOAD
# ----------------------------

@app.route("/api/requests/<request_id>/document", methods=["GET"])
def download_document(request_id):
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()

    target_user = None
    target_request = None

    for user in users:
        for req in user.get("requests", []):
            if req["requestId"] == request_id:
                target_user = user
                target_request = req
                break
        if target_request:
            break

    if not target_request:
        return {"error": "Request not found"}, 404

    DOCS_DIR = os.path.join(BASE_DIR, "documents")

    if target_request["documentType"] == "C20":
        file_path = os.path.join(DOCS_DIR, f"{request_id}.pdf")
        if not os.path.exists(file_path):
            file_path = generate_c20(target_user, request_id)

    elif target_request["documentType"] == "Extrait de rôle":
        file_path = os.path.join(DOCS_DIR, f"{request_id}_extrait.pdf")
        if not os.path.exists(file_path):
            file_path = generate_extrait_role(target_user, request_id)

    return send_file(file_path, as_attachment=True)

@app.route("/api/user/profile", methods=["PATCH"])
def update_user_profile():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()
    users = load_users()

    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user or user["role"] != "user":
        return {"error": "Forbidden"}, 403

    # ONLY allowed fields
    if "email" in data:
        user["profile"]["email"] = data["email"]

    if "phone" in data:
        user["profile"]["phone"] = data["phone"]

    save_users(users)

    return {"success": True}

# ----------------------------
# UPLOAD AVATAR
# ----------------------------
import base64

@app.route("/api/user/avatar", methods=["POST"])
def upload_avatar():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()
    avatar_b64 = data.get("avatarB64")

    if not avatar_b64:
        return {"error": "No image provided"}, 400

    # Decode base64
    try:
        header, encoded = avatar_b64.split(",", 1)
        image_data = base64.b64decode(encoded)
    except Exception:
        return {"error": "Invalid image format"}, 400

    # Save file
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = f"{user_id}.png"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(image_data)

    # 🔥 SAVE PATH IN users.json
    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    user["profile"]["avatar"] = f"/uploads/{filename}"

    save_users(users)

    return {
        "success": True,
        "avatarUrl": f"http://127.0.0.1:5000/uploads/{filename}"
    }
    
# ----------------------------
# DELETE AVATAR
# ----------------------------
@app.route("/api/user/avatar", methods=["DELETE"])
def delete_avatar():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json() or {}
    body_user_id = data.get("userId")

    # optional check (recommended)
    if body_user_id and body_user_id != user_id:
        return {"error": "Forbidden"}, 403

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    avatar_path = user["profile"].get("avatar")

    if avatar_path:
        full_path = os.path.join(BASE_DIR, avatar_path.lstrip("/"))
        if os.path.exists(full_path):
            os.remove(full_path)

    user["profile"]["avatar"] = ""
    save_users(users)

    return {"success": True}

# ----------------------------
# SERVE AVATAR
# ----------------------------
@app.route("/uploads/<filename>")
def serve_avatar(filename):
    return send_file(os.path.join(BASE_DIR, "uploads", filename))

# ----------------------------
# CHANGE PASSWORD
# ----------------------------
@app.route("/api/user/password", methods=["POST"])
def change_password():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()
    current = data.get("currentPassword")
    new = data.get("newPassword")

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user:
        return {"error": "User not found"}, 404

    if user["auth"]["password"] != current:
        return {"error": "Incorrect password"}, 400

    user["auth"]["password"] = new
    save_users(users)

    return {"success": True}

#-----------------------------
# ADMIN PROFILE EDIT
#-----------------------------
@app.route("/api/admin/profile", methods=["PUT"])
def update_admin_profile():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()
    users = load_users()

    admin = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not admin or admin["role"] != "admin":
        return {"error": "Forbidden"}, 403

    new_first = data.get("firstName")
    new_last = data.get("lastName")
    new_email = data.get("email")

    old_email = admin["auth"]["id"]

    # ----------------------------
    # UPDATE NAME
    # ----------------------------
    if new_first:
        admin["profile"]["firstName"] = new_first

    if new_last:
        admin["profile"]["lastName"] = new_last

    # ----------------------------
    # UPDATE EMAIL (LOGIN ID)
    # ----------------------------
    new_token = None

    if new_email and new_email != old_email:
        # Check if email already exists
        exists = any(u["auth"]["id"] == new_email for u in users)
        if exists:
            return {"error": "Email already in use"}, 400

        # 🔥 CRITICAL: update auth.id
        admin["auth"]["id"] = new_email

        # Generate new token
        new_token = f"token-{new_email}"

    save_users(users)

    # ----------------------------
    # RESPONSE
    # ----------------------------
    if new_token:
        return {
            "success": True,
            "newToken": new_token
        }

    return {"success": True}

# ----------------------------
# NOTIFICATIONS
# ----------------------------

@app.route("/api/notifications", methods=["GET"])
def notifications():
    user_id = extract_user_id()
    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    return [n for n in user.get("notifications", []) if not n.get("deleted", False)] if user else []


@app.route("/api/notifications/<notif_id>/read", methods=["POST"])
def mark_notification_read(notif_id):
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user:
        return {"error": "User not found"}, 404

    for notif in user.get("notifications", []):
        if notif["id"] == notif_id:
            notif["read"] = True
            save_users(users)
            return {"message": "Notification marked as read"}

    return {"error": "Notification not found"}, 404


@app.route("/api/notifications/read-all", methods=["POST"])
def mark_all_notifications_read():
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user:
        return {"error": "User not found"}, 404

    for notif in user.get("notifications", []):
        notif["read"] = True

    save_users(users)
    return {"message": "All notifications marked as read"}


@app.route("/api/notifications/<notif_id>", methods=["DELETE"])
def delete_notification(notif_id):
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    users = load_users()
    user = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not user:
        return {"error": "User not found"}, 404

    for notif in user.get("notifications", []):
        if notif["id"] == notif_id:
            notif["deleted"] = True
            save_users(users)
            return {"message": "Notification deleted"}

    return {"error": "Notification not found"}, 404

# ----------------------------
# RUN
# ----------------------------

if __name__ == "__main__":
    app.run(debug=True)