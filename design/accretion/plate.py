#!/usr/bin/env python3
"""ACCRETION · Plate VII — a plate of deposits.

Every mark on the page is derived, not invented: the tick fields are the bytes
of a real hash chain, each stratum computed from the one above it. The single
discontinuity is a genuine break in that chain, not a drawn decoration.
"""

import hashlib
import math
import pathlib

import cairo
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

TUK = pathlib.Path(__file__).parent
SHRIFTOVE = pathlib.Path('/root/.claude/skills/synced/canvas-design/canvas-fonts')

# ── лист ─────────────────────────────────────────────────────────────────────
MM = 72 / 25.4
W, H = 420 * MM, 594 * MM              # A2 portrait
LYAVO, DYASNO = 118.0, 118.0
GORE, DOLU = 112.0, 118.0
SHIR = W - LYAVO - DYASNO

# ── палитра ──────────────────────────────────────────────────────────────────
HARTIYA = (0.949, 0.933, 0.902)
MASTILO = (0.106, 0.098, 0.086)
AKTSENT = (0.690, 0.278, 0.169)


def sivo(a):
    return (*MASTILO, a)


# ── шрифт като контур, не като типография ───────────────────────────────────
class KairoPero(BasePen):
    def __init__(self, glifi, ctx, mashtab, ox, oy):
        super().__init__(glifi)
        self.c, self.m, self.ox, self.oy = ctx, mashtab, ox, oy

    def _moveTo(self, p):
        self.c.move_to(self.ox + p[0] * self.m, self.oy - p[1] * self.m)

    def _lineTo(self, p):
        self.c.line_to(self.ox + p[0] * self.m, self.oy - p[1] * self.m)

    def _curveToOne(self, a, b, c):
        self.c.curve_to(
            self.ox + a[0] * self.m, self.oy - a[1] * self.m,
            self.ox + b[0] * self.m, self.oy - b[1] * self.m,
            self.ox + c[0] * self.m, self.oy - c[1] * self.m,
        )

    def _closePath(self):
        self.c.close_path()


class LipsvashtGlif(Exception):
    """Шрифт, който няма знака, не бива да го преглъща мълчаливо."""


class Shrift:
    def __init__(self, ime):
        self.ime = ime
        self.tt = TTFont(SHRIFTOVE / f'{ime}.ttf')
        self.cmap = self.tt.getBestCmap()
        self.glifi = self.tt.getGlyphSet()
        self.upem = self.tt['head'].unitsPerEm
        self.hmtx = self.tt['hmtx']

    def _glif(self, znak):
        g = self.cmap.get(ord(znak))
        if g is None:
            raise LipsvashtGlif(f'{self.ime} няма „{znak}" (U+{ord(znak):04X})')
        return g

    def shirina(self, tekst, ryast, razredka=0.0):
        m = ryast / self.upem
        s = 0.0
        for z in tekst:
            s += self.hmtx[self._glif(z)][0] * m + razredka
        return s - (razredka if tekst else 0.0)

    def pishi(self, ctx, tekst, ryast, x, y, razredka=0.0, tsvyat=MASTILO):
        m = ryast / self.upem
        ctx.save()
        ctx.set_source_rgba(*(tsvyat if len(tsvyat) == 4 else (*tsvyat, 1.0)))
        kursor = x
        for z in tekst:
            g = self._glif(z)
            ctx.new_path()
            self.glifi[g].draw(KairoPero(self.glifi, ctx, m, kursor, y))
            ctx.fill()
            kursor += self.hmtx[g][0] * m + razredka
        ctx.restore()


JURA = Shrift('Jura-Light')
MONO = Shrift('IBMPlexMono-Regular')
SERIF = Shrift('IBMPlexSerif-Italic')


# ── веригата, която рисува сама себе си ─────────────────────────────────────
STRATA = 26
SCHUPENO = 17            # индексът, на който веригата се къса
TIKOVE = 104             # марки в един пласт


EHO = 18                 # колко марки един пласт наследява от горния


def veriga():
    """Истинска хеш-верига.

    Всеки пласт носи в началото си последните марки на предшественика си —
    prevHash, направен видим. На разрива наследяването спира: там полето
    започва от само себе си, и окото го усеща, преди да го е прочело.
    """
    pod = hashlib.sha256(b'ACCRETION').digest()
    redove = []
    predishni = None
    for k in range(STRATA):
        schupen = k == SCHUPENO
        surovo = (hashlib.sha256(b'DISCONTINUITY') if schupen
                  else hashlib.sha256(pod + k.to_bytes(2, 'big'))).digest()
        potok = list(b''.join(
            hashlib.sha256(surovo + j.to_bytes(1, 'big')).digest() for j in range(4)
        ))[:TIKOVE]
        if predishni is not None and not schupen:
            potok[:EHO] = predishni[-EHO:]
        redove.append((surovo, potok, schupen))
        predishni = potok
        pod = surovo
    return redove


# ── чертане ──────────────────────────────────────────────────────────────────
def hairline(ctx, x1, y, x2, a=0.20, w=0.4, tsvyat=None):
    ctx.save()
    ctx.set_source_rgba(*(tsvyat or sivo(a)))
    ctx.set_line_width(w)
    ctx.move_to(x1, y)
    ctx.line_to(x2, y)
    ctx.stroke()
    ctx.restore()


def registri(ctx, x1, y1, x2, y2, d=13.0):
    """Ъглови марки — листът е образец в кутия."""
    ctx.save()
    ctx.set_source_rgba(*sivo(0.34))
    ctx.set_line_width(0.5)
    for x, sx in ((x1, 1), (x2, -1)):
        for y, sy in ((y1, 1), (y2, -1)):
            ctx.move_to(x, y + sy * d)
            ctx.line_to(x, y)
            ctx.line_to(x + sx * d, y)
    ctx.stroke()
    ctx.restore()


FAULT = 14.0             # разместването на пласта при разрива


def narisuvay(ctx):
    ctx.set_source_rgb(*HARTIYA)
    ctx.paint()

    desen_x = W - DYASNO
    redove = veriga()

    # ── глава ───────────────────────────────────────────────────────────────
    registri(ctx, LYAVO - 26, GORE - 26, desen_x + 26, H - DOLU + 26)

    JURA.pishi(ctx, 'ACCRETION', 50, LYAVO, GORE + 52, razredka=15.0)
    for i, red in enumerate((
        'PL. VII',
        'STRATIGRAPHY OF A LEDGER',
        'SHA-256 · 26 DEPOSITS · FORWARD ONLY',
    )):
        MONO.pishi(ctx, red, 7.4, desen_x - MONO.shirina(red, 7.4, 1.7),
                   GORE + 12 + i * 18, razredka=1.7,
                   tsvyat=sivo(0.58 if i == 0 else 0.40))

    hairline(ctx, LYAVO, GORE + 78, desen_x, a=0.45, w=0.7)

    # ── пластовете ──────────────────────────────────────────────────────────
    seq_x = LYAVO + 34
    pole_x = LYAVO + 62
    pole_shir = 806.0
    tik_stapka = pole_shir / TIKOVE

    y0 = 262.0
    stapka = 40.0
    posleden = y0 + (STRATA - 1) * stapka

    for k, (surovo, potok, schupen) in enumerate(redove):
        y = y0 + k * stapka
        dyal = k / (STRATA - 1)                    # натрупването надолу
        max_vis = 8.5 + 19.0 * dyal
        osnovna_plut = 0.10 + 0.26 * dyal
        obhvat_plut = 0.30 + 0.22 * dyal
        otmestvane = FAULT if schupen else 0.0

        nomer = f'{k + 1:02d}'
        MONO.pishi(ctx, nomer, 7.2, seq_x - MONO.shirina(nomer, 7.2, 0.9), y + 2.4,
                   razredka=0.9,
                   tsvyat=sivo(0.66 if schupen else (0.40 if (k + 1) % 6 == 0 else 0.26)))

        ctx.save()
        ctx.set_line_width(0.8)
        ctx.set_line_cap(cairo.LINE_CAP_BUTT)
        podsilvane = 0.12 if schupen else 0.0
        for i, bayt in enumerate(potok):
            dyal_b = bayt / 255.0
            ctx.set_source_rgba(*sivo(osnovna_plut + podsilvane + obhvat_plut * dyal_b))
            x = pole_x + otmestvane + (i + 0.5) * tik_stapka
            ctx.move_to(x, y)
            ctx.line_to(x, y - (1.4 + dyal_b * max_vis))
            ctx.stroke()
        ctx.restore()

        # основата: непрекъсната, докато веригата държи
        if schupen:
            # Основата не продължава: тя се прекъсва и се разминава.
            ctx.save()
            ctx.set_source_rgba(*sivo(0.46))
            ctx.set_line_width(0.55)
            ctx.set_dash([2.4, 3.6])
            ctx.move_to(pole_x + otmestvane, y + 0.35)
            ctx.line_to(pole_x + otmestvane + pole_shir, y + 0.35)
            ctx.stroke()
            ctx.restore()
            # разломът, показан там, където горният пласт свършва
            ctx.save()
            ctx.set_source_rgba(*AKTSENT, 0.55)
            ctx.set_line_width(0.55)
            ctx.move_to(pole_x, y - stapka * 0.42)
            ctx.line_to(pole_x, y + 3.0)
            ctx.line_to(pole_x + otmestvane, y + 3.0)
            ctx.stroke()
            ctx.restore()
            ctx.save()
            ctx.set_source_rgba(*AKTSENT, 0.95)
            ctx.rectangle(LYAVO, y - 3.2, 3.2, 3.2)
            ctx.fill()
            ctx.restore()
        else:
            tezhak = (k + 1) % 6 == 0
            hairline(ctx, pole_x, y + 0.35, pole_x + pole_shir,
                     a=(0.30 if tezhak else 0.11) + 0.10 * dyal,
                     w=0.55 if tezhak else 0.4)

        podpis = surovo.hex()[:8]
        MONO.pishi(ctx, podpis, 7.2, desen_x - MONO.shirina(podpis, 7.2, 0.9), y + 2.4,
                   razredka=0.9, tsvyat=sivo(0.62 if schupen else 0.22 + 0.14 * dyal))

    # ── сверка · мерна скала, не текстура ──────────────────────────────────
    sv_y = posleden + 58
    hairline(ctx, LYAVO, sv_y, desen_x, a=0.45, w=0.7)
    MONO.pishi(ctx, 'RECONCILIATION', 7.4, LYAVO, sv_y + 22, razredka=1.7,
               tsvyat=sivo(0.58))

    DELENIYA, POKRITI = 110, 102
    del_stapka = pole_shir / DELENIYA

    for red, (etiket, broi) in enumerate((('IN', DELENIYA), ('OUT', POKRITI))):
        ry = sv_y + 66 + red * 36
        MONO.pishi(ctx, etiket, 7.2, seq_x - MONO.shirina(etiket, 7.2, 0.9), ry + 2.4,
                   razredka=0.9, tsvyat=sivo(0.30))

        kray_x = pole_x + broi * del_stapka

        # измерената дължина
        ctx.save()
        ctx.set_source_rgba(*sivo(0.66))
        ctx.set_line_width(1.5)
        ctx.move_to(pole_x, ry)
        ctx.line_to(kray_x, ry)
        ctx.stroke()
        ctx.set_line_width(1.0)
        # краят на непълната мярка е самият цвят — там няма нужда от засечка
        zasechki = (pole_x,) if broi < DELENIYA else (pole_x, kray_x)
        for x in zasechki:
            ctx.move_to(x, ry - 6.5)
            ctx.line_to(x, ry + 0.5)
        ctx.stroke()
        ctx.restore()

        # непокритото — единствената плътност от цвят на листа
        if broi < DELENIYA:
            ctx.save()
            ctx.set_source_rgba(*AKTSENT, 0.92)
            ctx.rectangle(kray_x, ry - 6.5, (DELENIYA - broi) * del_stapka, 6.5)
            ctx.fill()
            ctx.restore()

    # скалата · чертае се веднъж и служи и на двете мерки
    sk_y = sv_y + 66 + 18
    ctx.save()
    ctx.set_source_rgba(*sivo(0.26))
    ctx.set_line_width(0.4)
    for i in range(DELENIYA + 1):
        x = pole_x + i * del_stapka
        h = 5.0 if i % 10 == 0 else 2.4
        ctx.move_to(x, sk_y - h / 2)
        ctx.line_to(x, sk_y + h / 2)
    ctx.stroke()
    ctx.restore()

    # единственото число на листа — под липсващото, на същия десен ръб
    chislo = '0,80'
    desen_kray = pole_x + pole_shir
    JURA.pishi(ctx, chislo, 27, desen_kray - JURA.shirina(chislo, 27, 2.2),
               sv_y + 66 + 36 + 38, razredka=2.2, tsvyat=sivo(0.84))

    # ── подножие ────────────────────────────────────────────────────────────
    f_y = H - DOLU
    hairline(ctx, LYAVO, f_y - 42, desen_x, a=0.45, w=0.7)

    SERIF.pishi(ctx, 'нищо не се трие · само се добавя', 12.6, LYAVO, f_y - 14,
                razredka=0.3, tsvyat=sivo(0.66))
    opis = '26 STRATA · DISCONTINUITY AT 17 · UNRESOLVED 0,80'
    MONO.pishi(ctx, opis, 7.2, desen_x - MONO.shirina(opis, 7.2, 1.5), f_y - 14,
               razredka=1.5, tsvyat=sivo(0.36))


def iznesi():
    pdf = TUK / 'ACCRETION-plate-VII.pdf'
    povurhnost = cairo.PDFSurface(str(pdf), W, H)
    ctx = cairo.Context(povurhnost)
    narisuvay(ctx)
    povurhnost.finish()

    mashtab = 200 / 72
    png = TUK / 'ACCRETION-plate-VII.png'
    im = cairo.ImageSurface(cairo.FORMAT_RGB24,
                            math.ceil(W * mashtab), math.ceil(H * mashtab))
    ctx = cairo.Context(im)
    ctx.scale(mashtab, mashtab)
    narisuvay(ctx)
    im.write_to_png(str(png))

    print(f'{pdf.name} · {W:.0f}×{H:.0f} pt (A2)')
    print(f'{png.name} · {im.get_width()}×{im.get_height()} px (200 dpi)')


if __name__ == '__main__':
    iznesi()
