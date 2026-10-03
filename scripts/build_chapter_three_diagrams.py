from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "figures" / "chapter3"
OUT.mkdir(parents=True, exist_ok=True)

W = 1800
NAVY = "#17324D"
BLUE = "#2F6F9F"
TEAL = "#2E8B85"
GOLD = "#D6A84B"
RED = "#B85C5C"
LIGHT = "#EDF3F7"
PALE = "#F8FAFC"
TEXT = "#17212B"
MUTED = "#5C6875"
WHITE = "#FFFFFF"
LINE = "#9CAAB8"


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


F18, F20, F22, F24, F28, F32 = (font(x) for x in (18, 20, 22, 24, 28, 32))
B20, B22, B24, B28, B32, B38 = (font(x, True) for x in (20, 22, 24, 28, 32, 38))


def canvas(height, title):
    im = Image.new("RGB", (W, height), WHITE)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((35, 35, W - 35, height - 35), 22, fill=PALE, outline="#CBD5DF", width=3)
    d.text((75, 67), title, font=B38, fill=NAVY)
    d.line((75, 122, W - 75, 122), fill=BLUE, width=4)
    return im, d


def center_text(d, box, text, f=F24, fill=TEXT, spacing=6):
    x1, y1, x2, y2 = box
    lines = text.split("\n")
    heights = [d.textbbox((0, 0), line, font=f)[3] for line in lines]
    total = sum(heights) + spacing * (len(lines) - 1)
    y = y1 + (y2 - y1 - total) / 2
    for line, h in zip(lines, heights):
        boxw = d.textbbox((0, 0), line, font=f)[2]
        d.text((x1 + (x2 - x1 - boxw) / 2, y), line, font=f, fill=fill)
        y += h + spacing


def box(d, coords, text, fill=LIGHT, outline=BLUE, f=B24, radius=18):
    d.rounded_rectangle(coords, radius, fill=fill, outline=outline, width=3)
    center_text(d, coords, text, f=f)


def arrow(d, start, end, fill=BLUE, width=5):
    d.line((*start, *end), fill=fill, width=width)
    import math
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 18
    for delta in (2.55, -2.55):
        p = (end[0] + size * math.cos(angle + delta), end[1] + size * math.sin(angle + delta))
        d.line((*end, *p), fill=fill, width=width)


def save(im, name):
    im.save(OUT / name, optimize=True)


def development():
    im, d = canvas(520, "Iterative design science and development process")
    labels = ["Identify\nproblem", "Define solution\nobjectives", "Design and\ndevelop", "Demonstrate", "Evaluate", "Communicate"]
    colors = ["#E9F1F7", "#E8F4F2", "#FFF5DF", "#EDF3F7", "#F8ECEC", "#EDEAF5"]
    margin, gap = 75, 28
    bw = (W - 2 * margin - gap * 5) / 6
    y1, y2 = 190, 340
    for i, (label, fill) in enumerate(zip(labels, colors)):
        x1 = margin + i * (bw + gap)
        box(d, (x1, y1, x1 + bw, y2), label, fill=fill, f=B22)
        d.ellipse((x1 + bw / 2 - 22, 145, x1 + bw / 2 + 22, 189), fill=NAVY)
        center_text(d, (x1 + bw / 2 - 22, 145, x1 + bw / 2 + 22, 189), str(i + 1), f=B20, fill=WHITE)
        if i < 5:
            arrow(d, (x1 + bw, 265), (x1 + bw + gap - 5, 265))
    d.arc((365, 300, 1435, 465), 5, 175, fill=TEAL, width=5)
    arrow(d, (425, 394), (378, 354), fill=TEAL)
    center_text(d, (600, 382, 1200, 458), "Evaluation findings feed the next design iteration", f=F22, fill=TEAL)
    save(im, "figure_3_1_development_process.png")


def workflow():
    im, d = canvas(760, "Proposed end-to-end clinic workflow")
    lanes = [("PATIENT", 155, "#E9F1F7"), ("STAFF", 345, "#E8F4F2"), ("DOCTOR", 535, "#FFF5DF")]
    for name, y, fill in lanes:
        d.rounded_rectangle((70, y, 1730, y + 145), 18, fill=fill, outline="#C5D1DC", width=2)
        d.rounded_rectangle((85, y + 32, 250, y + 113), 14, fill=NAVY, outline=NAVY)
        center_text(d, (85, y + 32, 250, y + 113), name, f=B24, fill=WHITE)
    steps = [
        (300, 178, 510, 277, "Register /\nlog in"), (560, 178, 790, 277, "Find slot and\nbook"),
        (845, 178, 1060, 277, "Check in"), (1365, 178, 1665, 277, "View status and\nvisit summary"),
        (300, 368, 550, 467, "Configure doctors\nand departments"), (610, 368, 845, 467, "Confirm arrival /\nwalk-in"),
        (900, 368, 1125, 467, "Admit, return,\ntransfer or miss"),
        (465, 558, 720, 657, "Publish\navailability"), (795, 558, 1030, 657, "Call next\npatient"),
        (1100, 558, 1390, 657, "Record and complete\nconsultation"),
    ]
    for x1, y1, x2, y2, label in steps:
        box(d, (x1, y1, x2, y2), label, fill=WHITE, f=B20)
    arrow(d, (510, 227), (555, 227)); arrow(d, (790, 227), (840, 227)); arrow(d, (1060, 227), (1360, 227))
    arrow(d, (550, 417), (605, 417)); arrow(d, (845, 417), (895, 417))
    arrow(d, (720, 607), (790, 607)); arrow(d, (1030, 607), (1095, 607))
    arrow(d, (600, 558), (670, 472), fill=TEAL); arrow(d, (950, 472), (910, 553), fill=TEAL)
    arrow(d, (995, 553), (1010, 472), fill=TEAL); arrow(d, (1245, 553), (1500, 282), fill=TEAL)
    save(im, "figure_3_2_workflow.png")


def architecture():
    im, d = canvas(720, "Logical three-tier architecture")
    tiers = [(145, "PRESENTATION TIER", "#E9F1F7"), (325, "APPLICATION TIER", "#E8F4F2"), (525, "DATA TIER", "#FFF5DF")]
    for y, label, fill in tiers:
        d.rounded_rectangle((80, y, 1720, y + 135), 20, fill=fill, outline="#C5D1DC", width=2)
        d.text((105, y + 16), label, font=B20, fill=MUTED)
    for x, label in [(300, "Patient browser"), (700, "Doctor browser"), (1100, "Staff / admin browser")]:
        box(d, (x, 190, x + 300, 260), label, fill=WHITE, f=B20)
    box(d, (315, 370, 690, 445), "Express REST API", fill=WHITE)
    box(d, (755, 370, 1125, 445), "JWT and role policy", fill=WHITE)
    box(d, (1190, 370, 1570, 445), "Socket.IO gateway", fill=WHITE)
    box(d, (580, 565, 1220, 640), "PostgreSQL 16 · Sequelize models and migrations", fill=WHITE, f=B22)
    for x in (450, 850, 1250): arrow(d, (x, 265), (x, 360))
    arrow(d, (690, 407), (745, 407)); arrow(d, (1125, 407), (1180, 407))
    arrow(d, (500, 450), (720, 555)); arrow(d, (1380, 450), (1080, 555))
    center_text(d, (650, 285, 1150, 340), "Same-origin HTTPS + authenticated WebSocket", f=F20, fill=MUTED)
    save(im, "figure_3_3_architecture.png")


def use_cases():
    im, d = canvas(880, "Role-based use-case model")
    actors = [(95, 205, "Patient", BLUE), (95, 405, "Doctor", GOLD), (95, 605, "Staff", TEAL), (1460, 605, "Administrator", RED)]
    for x, y, name, color in actors:
        d.ellipse((x + 55, y, x + 105, y + 50), outline=color, width=5)
        d.line((x + 80, y + 50, x + 80, y + 125), fill=color, width=5)
        d.line((x + 35, y + 82, x + 125, y + 82), fill=color, width=5)
        d.line((x + 80, y + 125, x + 38, y + 170), fill=color, width=5)
        d.line((x + 80, y + 125, x + 122, y + 170), fill=color, width=5)
        center_text(d, (x, y + 174, x + 160, y + 220), name, f=B22, fill=color)
    d.rounded_rectangle((330, 155, 1430, 815), 25, fill=WHITE, outline=NAVY, width=4)
    cases = [
        (420, 195, 780, 275, "Register / authenticate"), (900, 195, 1320, 275, "Manage profile / notifications"),
        (420, 315, 780, 395, "Book appointment / check in"), (900, 315, 1320, 395, "Publish availability"),
        (420, 435, 780, 515, "View and control queue"), (900, 435, 1320, 515, "Record consultation"),
        (420, 555, 780, 635, "Manage clinic operations"), (900, 555, 1320, 635, "View reports / audit"),
        (660, 690, 1080, 770, "Manage staff accounts")]
    for coords in cases:
        d.ellipse(coords[:4], fill=LIGHT, outline=BLUE, width=3)
        center_text(d, coords[:4], coords[4], f=B20)
    # actor relationships, intentionally uncluttered
    for y in (235, 355): d.line((255, 290, 420, y), fill=BLUE, width=3)
    d.line((255, 490, 900, 355), fill=GOLD, width=3); d.line((255, 490, 420, 475), fill=GOLD, width=3); d.line((255, 490, 900, 475), fill=GOLD, width=3)
    for y in (475, 595, 595): d.line((255, 690, 420 if y != 595 else 900, y), fill=TEAL, width=3)
    d.line((1460, 690, 1320, 595), fill=RED, width=3); d.line((1460, 690, 1080, 730), fill=RED, width=3)
    save(im, "figure_3_4_use_cases.png")


def queue_states():
    im, d = canvas(690, "Controlled patient queue states")
    positions = {
        "WAITING": (120, 280, 400, 390), "CALLED": (500, 180, 780, 290), "ADMITTED": (900, 180, 1180, 290),
        "IN CONSULTATION": (1300, 280, 1660, 390), "COMPLETED": (1110, 500, 1430, 610), "MISSED": (410, 500, 690, 610)
    }
    fills = {"WAITING":"#E9F1F7","CALLED":"#FFF5DF","ADMITTED":"#E8F4F2","IN CONSULTATION":"#EDEAF5","COMPLETED":"#E5F3E8","MISSED":"#F8ECEC"}
    for name, coords in positions.items(): box(d, coords, name, fill=fills[name], f=B22)
    arrow(d,(400,320),(495,235)); arrow(d,(780,235),(895,235)); arrow(d,(1180,235),(1295,320)); arrow(d,(1480,390),(1350,495));
    arrow(d,(640,290),(1350,330),fill=TEAL); arrow(d,(270,390),(500,495),fill=RED)
    arrow(d,(640,290),(390,330),fill=GOLD)
    center_text(d,(325,200,545,250),"call",f=F20,fill=MUTED); center_text(d,(785,170,895,215),"admit",f=F20,fill=MUTED)
    center_text(d,(1160,285,1310,330),"begin",f=F20,fill=MUTED); center_text(d,(1320,425,1510,470),"complete",f=F20,fill=MUTED)
    center_text(d,(625,305,1110,350),"doctor may begin from an allowed active state",f=F18,fill=TEAL)
    d.text((105, 620), "Return and transfer operations preserve an authorized active state; completed and missed are terminal.", font=F20, fill=MUTED)
    save(im, "figure_3_5_queue_states.png")


def erd():
    im, d = canvas(1260, "Implemented relational data model")
    entities = {
        "USERS": (80,170,["PK id","email · role · status"]), "DEPARTMENTS": (620,170,["PK id","name · status"]),
        "DOCTORS": (1160,170,["PK id","FK user_id · department_id"]), "PATIENT_PROFILES": (80,430,["PK id","FK user_id"]),
        "DOCTOR_AVAILABILITIES": (1160,430,["PK id","FK doctor_id"]), "APPOINTMENTS": (620,430,["PK id","FK patient_id · doctor_id","FK department_id"]),
        "QUEUES": (620,715,["PK id","FK appointment_id · patient_id","FK doctor_id · department_id"]),
        "NOTIFICATIONS": (80,715,["PK id","FK recipient_user_id"]), "CONSULTATION_RECORDS": (620,1000,["PK id","FK appointment_id · queue_id","FK patient_id · doctor_id"]),
        "AUDIT_LOGS": (1160,715,["PK id","FK actor_user_id"]),
    }
    dims={}
    for name,(x,y,lines) in entities.items():
        bw=460 if name in ("APPOINTMENTS","QUEUES","CONSULTATION_RECORDS") else 430
        bh=150
        dims[name]=(x,y,x+bw,y+bh)
        d.rounded_rectangle(dims[name],15,fill=WHITE,outline=BLUE,width=3)
        d.rectangle((x,y,x+bw,y+48),fill=NAVY)
        center_text(d,(x,y,x+bw,y+48),name,f=B20,fill=WHITE)
        yy=y+60
        for line in lines:
            d.text((x+18,yy),line,font=F18,fill=TEXT); yy+=30
    def link(a,b,label="1 : many",color=LINE):
        A=dims[a]; B=dims[b];
        p1=((A[0]+A[2])//2,A[3]); p2=((B[0]+B[2])//2,B[1])
        d.line((*p1,*p2),fill=color,width=3)
        mx=(p1[0]+p2[0])//2; my=(p1[1]+p2[1])//2
        d.rounded_rectangle((mx-54,my-17,mx+54,my+17),8,fill=PALE)
        center_text(d,(mx-54,my-17,mx+54,my+17),label,f=F18,fill=MUTED)
    link("USERS","PATIENT_PROFILES","1 : 0..1"); link("DOCTORS","DOCTOR_AVAILABILITIES")
    link("DEPARTMENTS","APPOINTMENTS"); link("APPOINTMENTS","QUEUES","1 : 0..1"); link("QUEUES","CONSULTATION_RECORDS","1 : 0..1")
    d.line((510,245,1160,245),fill=LINE,width=3); d.text((800,215),"user owns doctor profile",font=F18,fill=MUTED)
    d.line((510,245,700,430),fill=LINE,width=3); d.text((420,330),"patient books",font=F18,fill=MUTED)
    d.line((1375,320,980,430),fill=LINE,width=3); d.text((1125,355),"doctor receives",font=F18,fill=MUTED)
    d.line((295,320,295,715),fill=LINE,width=3); d.text((105,615),"user receives",font=F18,fill=MUTED)
    d.line((510,245,1375,715),fill=LINE,width=2); d.text((1220,630),"actor performs",font=F18,fill=MUTED)
    save(im, "figure_3_6_erd.png")


def deployment():
    im,d=canvas(700,"Deployment profiles from one application source")
    box(d,(690,155,1110,245),"Versioned application source",fill=NAVY,outline=NAVY,f=B24)
    center_text(d,(690,155,1110,245),"Versioned application source",f=B24,fill=WHITE)
    profiles=[(90,"CLINIC LAN","Windows host + Docker Desktop","Nginx · backend · PostgreSQL","Browser access on clinic network","#E9F1F7"),
              (650,"EVALUATION","Isolated Docker project · port 8081","Fictional repeatable demonstration data","Never promoted to production","#FFF5DF"),
              (1210,"ONLINE SERVER","Generic Ubuntu VPS + domain","Caddy HTTPS · backend · PostgreSQL","Browser access through the Internet","#E8F4F2")]
    for x,title,l1,l2,l3,fill in profiles:
        d.rounded_rectangle((x,380,x+500,625),20,fill=fill,outline=BLUE,width=3)
        center_text(d,(x+20,400,x+480,445),title,f=B28,fill=NAVY)
        center_text(d,(x+25,460,x+475,595),f"{l1}\n{l2}\n{l3}",f=F20,fill=TEXT,spacing=14)
        arrow(d,(900,250),(x+250,370))
    save(im,"figure_3_7_deployment.png")


if __name__ == "__main__":
    development(); workflow(); architecture(); use_cases(); queue_states(); erd(); deployment()
    print(f"Created seven Chapter 3 figures in {OUT}")
