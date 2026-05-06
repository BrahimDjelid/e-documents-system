from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import json
import os
import random
import threading
from datetime import datetime, timezone, timedelta
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


def pick_admin_for_service(users, service):
    """
    Return one eligible admin for the given service using least-loaded selection
    (falls back to random if all have equal load). Returns None if no admin exists.
    Least-loaded = fewest currently-pending requests assigned to them.
    """
    eligible = [
        u for u in users
        if u.get("role") == "admin" and u.get("service") == service
    ]
    if not eligible:
        return None

    def pending_count(admin):
        admin_id = admin["auth"]["id"]
        count = 0
        for user in users:
            if user.get("role") != "user":
                continue
            for req in user.get("requests", []):
                if req.get("assignedTo") == admin_id and req.get("status") == "pending":
                    count += 1
        return count

    # Sort by pending load, shuffle within tied groups for fairness
    min_load = min(pending_count(a) for a in eligible)
    least_loaded = [a for a in eligible if pending_count(a) == min_load]
    return random.choice(least_loaded)


def _request_visible_to_admin(req, admin_id, admin_service):
    """
    Return True if the given request should appear in this admin's queue.
    Priority: assignedTo field -> fallback to service match (backward compat).
    """
    assigned = req.get("assignedTo")
    if assigned:
        return assigned == admin_id
    # Legacy requests with no assignedTo: fall back to service matching
    return req.get("documentType") == admin_service


# ----------------------------
# C20 PDF GENERATOR
# ----------------------------
def generate_c20(user_obj, request_obj, request_id):
    DOCS_DIR = os.path.join(BASE_DIR, "documents")
    os.makedirs(DOCS_DIR, exist_ok=True)

    filename = os.path.join(DOCS_DIR, f"{request_id}.pdf")

    if os.path.exists(filename):
        return filename

    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    # ----------------------------
    # HEADER
    # ----------------------------
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, height - 40,  "REPUBLIQUE ALGERIENNE")
    c.drawString(40, height - 55,  "DEMOCRATIQUE ET POPULAIRE")
    c.drawString(40, height - 80,  "MINISTERE DES FINANCES")
    c.drawString(40, height - 95,  "DIRECTION GENERALE")
    c.drawString(40, height - 110, "DES IMPOTS")

    c.setFont("Helvetica", 10)
    c.drawString(width - 160, height - 40, "Serie C  n 20")

    # ----------------------------
    # TITLE
    # ----------------------------
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 150, "CERTIFICAT")
    c.line(width / 2 - 80, height - 160, width / 2 + 80, height - 160)

    profile = user_obj["profile"]
    full_name = f"{profile['firstName']} {profile['lastName']}"
    nif = user_obj["auth"]["id"]

    y = height - 220

    # ----------------------------
    # TEXT
    # ----------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Le responsable du département gestion des impôts, soussigné")

    y -= 22

    c.setFont("Helvetica", 11)
    text = f"Certifie que M {full_name}"
    c.drawString(40, y, text)

    text_width = c.stringWidth(text, "Helvetica", 11)
    c.line(40, y - 3, 40 + text_width, y - 3)

    y -= 20   # smaller spacing after name (was 35)

    # ----------------------------
    # NIF (ALIGNED VERSION)
    # ----------------------------
    y -= 18

    c.setFont("Helvetica", 11)

    # Draw label
    c.drawString(40, y, "N.I.F :")

    # Measure label width to align boxes properly
    label_width = c.stringWidth("N.I.F :", "Helvetica", 11)

    # Start boxes right after label (with small gap)
    box_x = 40 + label_width + 8

    # Vertical alignment control
    box_size = 12
    baseline_adjust = 3   # 🔥 key value

    for digit in nif:
        # Align box to text baseline
        c.rect(box_x, y - baseline_adjust, box_size, box_size)

        # Center digit inside box
        c.drawCentredString(
            box_x + box_size / 2,
            y - baseline_adjust + 2,
            digit
        )

        box_x += box_size + 3

    # ----------------------------
    # ADDRESS + FINANCIAL DECLARATION
    # ----------------------------

    # Resolve financial data
    req_year = request_obj.get("year")
    financials = user_obj.get("taxInfo", {}).get("financials", [])
    financial_entry = next(
        (f for f in financials if f.get("year") == req_year),
        None
    )

    def fmt_currency(value):
        try:
            return f"{int(value):,}".replace(",", " ")
        except (TypeError, ValueError):
            return "N/A"

    business_address = user_obj.get("taxInfo", {}).get("businessAddress", "N/A")
    year_label = str(req_year) if req_year else "N/A"
    ca  = fmt_currency(financial_entry.get("chiffreAffaire")) if financial_entry else "N/A"
    ben = fmt_currency(financial_entry.get("benefice"))       if financial_entry else "N/A"

    # Lines content in order — each tuple is (text, bold)
    form_lines = [
        (f"Demeurant à : {business_address}",                               False),
        ("L'intéressé a déclaré ce qui suit :",                             True),
        (f"Exercice : {year_label}",                                        False),
        (f"Chiffre d'affaires : {ca} DA",                                   False),
        (f"Bénéfice déclaré : {ben} DA",                                    False),
        ("Ce certificat est délivré pour servir et valoir ce que de droit", False),
        ("dans les limites permises par la loi.",                            False),
    ]

    LINE_GAP   = 22   # vertical distance between lines
    TEXT_LIFT  = 4    # how many pts the text sits above the line

    y -= 30
    c.setLineWidth(0.5)

    for text, bold in form_lines:
        # Write text slightly above the line
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11)
        c.drawString(42, y + TEXT_LIFT, text)
        # Draw the underline
        c.line(40, y, width - 40, y)
        y -= LINE_GAP

    c.setLineWidth(1)   # restore default line width

    # ----------------------------
    # LOCATION + DATE  (populated from approvedAt)
    # ----------------------------
    y -= 20

    # Parse approvedAt if available
    approved_at_raw = request_obj.get("approvedAt")

    # Algeria timezone (UTC+1)
    algeria_tz = timezone(timedelta(hours=1))

    if approved_at_raw:
        try:
            # Parse stored UTC timestamp
            dt_utc = datetime.fromisoformat(
                approved_at_raw.replace("Z", "+00:00")
            )

            # Convert to Algeria local time
            dt_local = dt_utc.astimezone(algeria_tz)

            date_str = dt_local.strftime("%d/%m/%Y")
            time_str = dt_local.strftime("%H:%M")

            fait_a_text = "Fait à : Bouira"
            le_text = f"Le : {date_str} à {time_str}"

        except Exception:
            fait_a_text = "Fait à : .............................."
            le_text = "Le : .............................."

    else:
        fait_a_text = "Fait à : .............................."
        le_text = "Le : .............................."

    # Draw "Fait à" on the left
    c.setFont("Helvetica", 11)
    c.drawString(40, y, fait_a_text)

    # Draw "Le" on the right with underline (bonus)
    le_x = 300
    c.drawString(le_x, y, le_text)
    le_width = c.stringWidth(le_text, "Helvetica", 11)
    c.line(le_x, y - 3, le_x + le_width, y - 3)

    # ----------------------------
    # SIGNATURE BLOCK
    # ----------------------------
    y -= 70

    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 40, y, "Le Responsable")

    y -= 14
    c.drawRightString(width - 40, y, "du département")

    y -= 14
    c.drawRightString(width - 40, y, "gestion des impôts")

    # ----------------------------
    # SIGNATURE LINE
    # ----------------------------
    y -= 45

    line_width = 120
    line_x_end = width - 40
    line_x_start = line_x_end - line_width

    c.line(line_x_start, y, line_x_end, y)

    c.setFont("Helvetica", 8)
    c.drawCentredString((line_x_start + line_x_end) / 2, y - 10, "Signature")

    # ----------------------------
    # SIGNATURE IMAGE
    # ----------------------------
    # Get admin who processed the request
    admin_id = request_obj.get("processedBy")

    admin = next(
        (u for u in load_users() if u["auth"]["id"] == admin_id and u["role"] == "admin"),
        None
    )

    SIGN_PATH = None

    if admin:
        national_id = admin.get("profile", {}).get("nationalId")

        if national_id:
            SIGN_PATH = os.path.join(
                BASE_DIR,
                "assets",
                "signatures",
                f"{national_id}.png"
            )

    if SIGN_PATH and os.path.exists(SIGN_PATH):
        sig_width = 230
        sig_height = 80

        line_center = (line_x_start + line_x_end) / 2

        sig_x = line_center - (sig_width / 2)
        sig_y = y - 28

        c.drawImage(
            SIGN_PATH,
            sig_x,
            sig_y,
            width=sig_width,
            height=sig_height,
            mask='auto',
            preserveAspectRatio=True
        )

    # ----------------------------
    # STAMP
    # ----------------------------
    STAMP_PATH = os.path.join(BASE_DIR, "assets", "stamp.png")

    stamp_size = 85
    stamp_x = line_x_start - 90
    stamp_y = y - 40

    if os.path.exists(STAMP_PATH):
        c.saveState()
        c.translate(stamp_x + stamp_size/2, stamp_y + stamp_size/2)
        c.rotate(-8)
        c.drawImage(
            STAMP_PATH,
            -stamp_size/2,
            -stamp_size/2,
            width=stamp_size,
            height=stamp_size,
            mask='auto'
        )
        c.restoreState()
        
    # ----------------------------
    # SAVE
    # ----------------------------
    c.save()
    return filename

# ----------------------------
# Extrait de role PDF GENERATOR
# ----------------------------
def generate_extrait_role(user_obj, request_obj, request_id, admin_name=""):
    DOCS_DIR = os.path.join(BASE_DIR, "documents")
    os.makedirs(DOCS_DIR, exist_ok=True)

    filename = os.path.join(DOCS_DIR, f"{request_id}_extrait.pdf")

    if os.path.exists(filename):
        return filename

    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    profile = user_obj.get("profile", {})
    tax = user_obj.get("taxInfo", {})
    records = tax.get("taxRecords", [])

    if records:
        latest_year = max(r["year"] for r in records)
        records = [r for r in records if r["year"] == latest_year]

    full_name = f"{profile.get('firstName','')} {profile.get('lastName','')}"
    nif = user_obj["auth"]["id"]
    address = tax.get("businessAddress", "N/A")
    activity = tax.get("mainActivity", {}).get("activityName", "N/A")

    top = height - 40

    # =========================
    # HEADER
    # =========================
    c.setFont("Helvetica-Bold", 10)

    c.drawString(40, top, "REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE")
    c.drawString(40, top - 15, "MINISTERE DES FINANCES")
    c.drawString(40, top - 30, "DIRECTION GENERALE DES IMPOTS")

    c.drawString(40, top - 45, "RECETTE DES IMPOTS: CDI BOUIRA")
    c.drawRightString(width - 40, top - 45, "EXTRAIT DES ROLES")

    header_bottom = top - 60
    c.line(40, header_bottom, width - 40, header_bottom)

    # =========================
    # IDENTIFICATION BOX
    # =========================
    box_x = 40
    box_w = width - 80
    box_h = 95

    box_y = header_bottom - 28 - box_h

    c.setLineWidth(2)
    c.rect(box_x, box_y, box_w, box_h)

    c.setFont("Helvetica-Bold", 11)
    c.drawString(box_x + 12, box_y + box_h - 18, "IDENTIFICATION DU CONTRIBUABLE")

    c.setFont("Helvetica", 10)

    y = box_y + box_h - 42

    c.drawString(box_x + 12, y, f"NIF: {nif}")
    c.drawString(box_x + 260, y, f"Nom: {full_name}")

    y -= 22
    c.drawString(box_x + 12, y, f"Adresse: {address}")

    y -= 22
    c.drawString(box_x + 12, y, f"Activité: {activity}")

    # =========================
    # TABLE
    # =========================
    gap = 32
    table_top = box_y - gap

    # Increased row height for cleaner spacing
    row_h = 24

    table_x = box_x
    table_w = box_w

    # Column widths
    base_widths = [55, 55, 75, 75, 85, 85, 70]
    total_base = sum(base_widths)
    scale = table_w / total_base
    widths = [w * scale for w in base_widths]

    # Main columns
    columns = [
        ("Type", widths[0]),
        ("Année", widths[1]),
        ("Principal", widths[2]),
        ("Pénalités", widths[3]),
        ("Payé Principal", widths[4]),
        ("Payé Pénalités", widths[5]),
        ("Reste dû", widths[6]),
    ]

    # 2 header rows + data rows + total row
    num_rows = max(len(records), 1) + 3

    table_h = num_rows * row_h
    table_y = table_top - table_h

    # Outer border
    c.setLineWidth(2)
    c.rect(table_x, table_y, table_w, table_h)

    c.setLineWidth(1)

    # -------------------------
    # Vertical lines
    # -------------------------
    x_positions = [table_x]
    x = table_x

    for _, w in columns:
        x += w
        x_positions.append(x)

    # =========================
    # VERTICAL LINES
    # =========================

    # Y position where grouped header ends
    grouped_header_bottom = table_y + table_h - row_h

    for i, xp in enumerate(x_positions):

        # Outer borders
        if i == 0 or i == len(x_positions) - 1:
            c.line(xp, table_y, xp, table_y + table_h)

        # Main separators (full height)
        elif i in [1, 2, 4, 6]:
            c.line(xp, table_y, xp, table_y + table_h)

        # Inner separators inside grouped headers
        # stop before top grouped header row
        else:
            c.line(xp, table_y, xp, grouped_header_bottom)

    # -------------------------
    # Horizontal lines
    # -------------------------
    for i in range(num_rows + 1):
        y_line = table_y + i * row_h
        c.line(table_x, y_line, table_x + table_w, y_line)

    # =========================
    # HEADER ROW 1 (GROUPS)
    # =========================
    c.setFont("Helvetica-Bold", 8)

    top_header_y = table_y + table_h - (row_h / 2) + 3

    # COTISATIONS ÉMISES
    emitted_x_start = x_positions[2]
    emitted_x_end = x_positions[4]

    c.drawCentredString(
        (emitted_x_start + emitted_x_end) / 2,
        top_header_y,
        "COTISATIONS ÉMISES"
    )

    # VERSEMENT EFFECTUES
    paid_x_start = x_positions[4]
    paid_x_end = x_positions[6]

    c.drawCentredString(
        (paid_x_start + paid_x_end) / 2,
        top_header_y,
        "VERSEMENT EFFECTUES"
    )

    # =========================
    # HEADER ROW 2 (COLUMNS)
    # =========================
    second_header_y = top_header_y - row_h

    c.setFont("Helvetica-Bold", 7.5)

    x = table_x

    for title, w in columns:
        c.drawCentredString(
            x + (w / 2),
            second_header_y,
            title
        )
        x += w

    # =========================
    # DATA ROWS
    # =========================
    c.setFont("Helvetica", 8)

    y = second_header_y - row_h

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

        values = [
            r.get("type", "-"),
            r["year"],
            principal,
            penalties,
            paid_p,
            paid_pen,
            reste
        ]

        x = table_x

        for i, v in enumerate(values):
            c.drawCentredString(
                x + (columns[i][1] / 2),
                y,
                str(v)
            )
            x += columns[i][1]

        y -= row_h

    # =========================
    # TOTAL ROW
    # =========================
    total_reste = (totals[0] + totals[1]) - (totals[2] + totals[3])

    c.setFont("Helvetica-Bold", 8)

    values = [
        "",
        "TOTAL",
        totals[0],
        totals[1],
        totals[2],
        totals[3],
        total_reste
    ]

    x = table_x

    for i, v in enumerate(values):
        c.drawCentredString(
            x + (columns[i][1] / 2),
            y,
            str(v)
        )
        x += columns[i][1]

    # =========================
    # N.B TEXT
    # =========================
    nb_y = table_y - 40
    c.setFont("Helvetica", 8)

    text_lines = [
        "N.B: En application des dispositions combinées des articles 291 du Code des Impôts Directes et",
        "Taxes Assimilées et 184 de la loi de finances pour 2002, la délivrance des extraits de rôles aux",
        "contribuables est gratuite. Ceux-ci, ne peuvent demander des extraits de roles aux titres",
        "de 1'IRG, IBS, VF et TAP qu'en ce qui concerne leurs cotisations."
    ]

    for line in text_lines:
        c.drawString(40, nb_y, line)
        nb_y -= 12

    # =========================
    # FOOTER
    # =========================
    footer_y = nb_y - 55
    
    # =========================
    # APPROVAL DATE + LOCAL TIME
    # =========================

    approved_at_raw = request_obj.get("approvedAt")

    # Algeria timezone (UTC+1)
    algeria_tz = timezone(timedelta(hours=1))

    if approved_at_raw:
        try:
            # Parse UTC timestamp
            dt_utc = datetime.fromisoformat(
                approved_at_raw.replace("Z", "+00:00")
            )

            # Convert to Algeria local time
            dt_local = dt_utc.astimezone(algeria_tz)

            date_text = dt_local.strftime("%d.%m.%Y")
            time_text = dt_local.strftime("%H:%M")

        except Exception:
            now_local = datetime.now(algeria_tz)

            date_text = now_local.strftime("%d.%m.%Y")
            time_text = now_local.strftime("%H:%M")

    else:
        now_local = datetime.now(algeria_tz)

        date_text = now_local.strftime("%d.%m.%Y")
        time_text = now_local.strftime("%H:%M")

    c.drawString(40, footer_y, "A CDI BOUIRA,")
    c.drawString(40, footer_y - 15, f"le {date_text} à {time_text}")
    c.drawString(40, footer_y - 30, "Certifié exact")
    c.drawString(40, footer_y - 45, "Le Receveur des Impots")

    center_x = width / 2 - 65
    
    STAMP_PATH = os.path.join(BASE_DIR, "assets", "stamp.png")

    stamp_size = 90

    # ⬅️ move slightly left
    stamp_x = center_x - (stamp_size / 2) - 25

    # ⬇️ move slightly down
    stamp_y = footer_y - 55

    if os.path.exists(STAMP_PATH):
        c.saveState()

        # rotate around center of stamp
        c.translate(stamp_x + stamp_size / 2, stamp_y + stamp_size / 2)

        # 🔄 slight rotation
        c.rotate(-10)

        c.drawImage(
            STAMP_PATH,
            -stamp_size / 2,
            -stamp_size / 2,
            width=stamp_size,
            height=stamp_size,
            mask='auto'
        )

        c.restoreState()

    c.drawCentredString(center_x, footer_y, "Etabli par l'Agent:")
    c.drawCentredString(center_x, footer_y - 15, f"M {admin_name}")
    c.drawCentredString(center_x, footer_y - 30, "Fonction : .........................")
    
    right_x = width - 250

    
    # Get admin who processed the request
    admin_id = request_obj.get("processedBy")

    admin = next(
        (u for u in load_users() if u["auth"]["id"] == admin_id and u["role"] == "admin"),
        None
    )

    SIGN_PATH = None

    if admin:
        national_id = admin.get("profile", {}).get("nationalId")

        if national_id:
            SIGN_PATH = os.path.join(
                BASE_DIR,
                "assets",
                "signatures",
                f"{national_id}.png"
            )
    
    sig_width = 150
    sig_height = 60

    # Mid space between center block and right block
    sig_x = center_x + (right_x - center_x) / 2 - (sig_width / 2)

    # Align vertically with name / function area
    sig_y = footer_y - 48

    if SIGN_PATH and os.path.exists(SIGN_PATH):
        c.saveState()

        # Move origin to center of signature for rotation
        c.translate(sig_x + sig_width / 2, sig_y + sig_height / 2)

        # 🔥 slight rotation (natural look)
        c.rotate(-15)

        # Draw centered
        c.drawImage(
            SIGN_PATH,
            -sig_width / 2,
            -sig_height / 2,
            width=sig_width,
            height=sig_height,
            mask='auto',
            preserveAspectRatio=True
        )

        c.restoreState()

    right_lines = [
        "Références des échéanciers, éventuellement accordés:",
        "Date de signature de l'engagement: .............................",
        "Montant du versement initial exige: ............................",
        "Montant de la mensualité fixée en principal: ..................",
        "N° et Dte sursis legal de paiement: ............................"
    ]

    y = footer_y
    LINE_PATH = os.path.join(BASE_DIR, "assets", "line.png")

    for line in right_lines:
        c.drawString(right_x, y, line)

        if "..." in line and os.path.exists(LINE_PATH):

            prefix = line.split("...")[0]
            prefix_width = c.stringWidth(prefix, "Helvetica", 11)

            # keep your tuned alignment
            line_x = right_x + prefix_width - 85

            c.saveState()

            c.translate(line_x, y - 15)

            # slight angle
            c.rotate(10)

            c.setFillAlpha(1)

            # 📏 bigger + thicker
            width = 150
            height = 34

            # draw twice → good density without blur
            c.drawImage(LINE_PATH, 0, 0, width=width, height=height, mask='auto')
            c.drawImage(LINE_PATH, 0, 0, width=width, height=height, mask='auto')

            c.restoreState()

        y -= 15
   
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

        # ASSIGN TO ONE ADMIN (least-loaded, random tie-break)
        assigned_admin = pick_admin_for_service(users, data["documentType"])
        assigned_to = assigned_admin["auth"]["id"] if assigned_admin else None

        # CREATE REQUEST
        new_request = {
            "requestId": data["requestId"],
            "documentType": data["documentType"],
            "status": "pending",
            "submittedAt": data["submittedAt"],
            "note": "",
            "assignedTo": assigned_to
        }

        # Persist the fiscal year for C20 requests
        if data["documentType"] == "C20" and data.get("year"):
            new_request["year"] = data["year"]

        user.setdefault("requests", []).append(new_request)

        # NOTIFY ONLY the assigned admin
        if assigned_admin:
            notif = {
                "id": f"NOTIF-NEW-REQUEST-{data['requestId']}",
                "type": "new_request",
                "message": f"New {data['documentType']} request from {data['applicant']['fullName']}.",
                "requestId": data["requestId"],
                "read": False,
                "deleted": False,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }
            assigned_admin.setdefault("notifications", []).append(notif)

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
            if not _request_visible_to_admin(req, user_id, service):
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
            if not _request_visible_to_admin(req, user_id, service):
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

                # Authorization: admin must be assigned or (legacy) same service
                if not _request_visible_to_admin(req, user_id, admin.get("service")):
                    return {"error": "Forbidden"}, 403

                # Immutability: approved/rejected decisions cannot be changed
                current_status = req.get("status", "pending")
                if current_status in ("approved", "rejected"):
                    return {"error": "Decision already finalized"}, 400

                new_status = data.get("status")

                # Only allow transitions from pending
                if new_status not in ("approved", "rejected"):
                    return {"error": "Invalid status transition"}, 400
                doc_type = req.get("documentType", "document")

                req["status"] = new_status
                req["note"] = data.get("note", "")
                req["processedBy"] = data.get("processedBy")

                if new_status == "approved":
                    req["approvedAt"] = datetime.utcnow().isoformat() + "Z"

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

                # Persist the decision BEFORE starting generation so the
                # HTTP response returns instantly — never blocked by PDF work.
                save_users(users)

                # Pre-generate PDF in a background thread (approved only).
                # deepcopy isolates the snapshots so the thread is safe after
                # this request context exits.
                if new_status == "approved":
                    import copy
                    user_snapshot = copy.deepcopy(user)
                    req_snapshot  = copy.deepcopy(req)
                    admin_snapshot = copy.deepcopy(admin)

                    def _generate_pdf_background(u, r, rid, adm):
                        try:
                            if r["documentType"] == "C20":
                                generate_c20(u, r, rid)
                            elif r["documentType"] == "Extrait de r\u00f4le":
                                ap = adm.get("profile", {})
                                name = f"{ap.get('firstName','')} {ap.get('lastName','')}".strip()
                                generate_extrait_role(u, r, rid, name)
                            print(f"[bg] PDF ready for {rid}")
                        except Exception as e:
                            print(f"[bg] PDF generation failed for {rid}: {e}")

                    threading.Thread(
                        target=_generate_pdf_background,
                        args=(user_snapshot, req_snapshot, request_id, admin_snapshot),
                        daemon=True
                    ).start()

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

    # Only approved requests can be downloaded
    if target_request["status"] != "approved":
        return {"error": "Document not available"}, 403

    DOCS_DIR = os.path.join(BASE_DIR, "documents")

    if target_request["documentType"] == "C20":
        file_path = os.path.join(DOCS_DIR, f"{request_id}.pdf")
        if not os.path.exists(file_path):
            file_path = generate_c20(target_user,target_request,  request_id)

    elif target_request["documentType"] == "Extrait de rôle":
        file_path = os.path.join(DOCS_DIR, f"{request_id}_extrait.pdf")
        if not os.path.exists(file_path):
            admin_id = target_request.get("processedBy")

            admin_name = "Agent inconnu"

            if admin_id:
                admin_user = next(
                    (u for u in users if u["auth"]["id"] == admin_id and u["role"] == "admin"),
                    None
                )

                if admin_user:
                    profile = admin_user.get("profile", {})
                    first = profile.get("firstName", "")
                    last = profile.get("lastName", "")
                    admin_name = f"{first} {last}".strip()

            file_path = generate_extrait_role(target_user, request_id, admin_name)

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

    new_email = data.get("email")
    
    old_email = admin["auth"]["id"]

    # ----------------------------
    # UPDATE EMAIL (LOGIN ID)
    # ----------------------------
    new_token = None

    if new_email and new_email != old_email:
        # Check if email already exists
        exists = any(u["auth"]["id"] == new_email for u in users)
        if exists:
            return {"error": "Email already in use"}, 400

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
# ADMIN — REASSIGN REQUEST
# Optional endpoint: allows manually moving a request to a different admin.
# POST /api/requests/<request_id>/reassign
# Body: { "assignTo": "target-admin@mail.com" }
# Only a currently assigned admin (or same-service admin for legacy requests)
# can trigger a reassignment.
# ----------------------------

@app.route("/api/requests/<request_id>/reassign", methods=["POST"])
def reassign_request(request_id):
    user_id = extract_user_id()
    if not user_id:
        return {"error": "Unauthorized"}, 401

    data = request.get_json() or {}
    target_admin_id = data.get("assignTo")
    if not target_admin_id:
        return {"error": "assignTo is required"}, 400

    users = load_users()
    admin = next((u for u in users if u["auth"]["id"] == user_id), None)

    if not admin or admin["role"] != "admin":
        return {"error": "Forbidden"}, 403

    # Validate target admin exists and shares the same service
    target_admin = next(
        (u for u in users if u["auth"]["id"] == target_admin_id and u.get("role") == "admin"),
        None
    )
    if not target_admin:
        return {"error": "Target admin not found"}, 404

    for user in users:
        for req in user.get("requests", []):
            if req["requestId"] != request_id:
                continue

            # Caller must have visibility over this request
            if not _request_visible_to_admin(req, user_id, admin.get("service")):
                return {"error": "Forbidden"}, 403

            # Target admin must handle the same document type
            if target_admin.get("service") != req["documentType"]:
                return {"error": "Target admin does not handle this document type"}, 400

            req["assignedTo"] = target_admin_id
            save_users(users)
            return {
                "requestId": request_id,
                "assignedTo": target_admin_id
            }

    return {"error": "Request not found"}, 404


# ----------------------------
# RUN
# ----------------------------

if __name__ == "__main__":
    app.run(debug=True)