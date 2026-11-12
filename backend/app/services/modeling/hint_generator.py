"""Three-level hints that never reveal the answer (docs/DESAIN-PEDAGOGIS.md §6).

Level 1 — Makna (meaning), Level 2 — Visual, Level 3 — Strategi (strategy).

STRUCTURAL GUARANTEE: `make_hint` receives a `HintView` that contains only the
given quantities, never the answer or derived intermediate results. Counts are
written in words so hint text contains no digits other than given numbers.
tests/test_hints_no_leak.py enforces this for every template.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass

from app.services.modeling import visual_script
from app.services.modeling.expr import fmt_int, fmt_operand, names_in_order, parse, render
from app.services.modeling.schema import Context, Template
from app.services.modeling.solver import count_operations, first_operation

NUMBER_WORDS = {1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima"}
SIGN_WORDS = {"+": "positif (+)", "-": "negatif (−)", "0": "nol"}

RELATION_MEANING = {
    ("CHG", "end"): "Keadaan awal + perubahan = keadaan akhir.",
    ("CHG", "start"): "Keadaan awal + perubahan = keadaan akhir. Di soal ini keadaan awalnya "
    "belum diketahui. Mulailah dari keadaan akhir, lalu lakukan kebalikan dari perubahannya.",
    ("CHG", "change"): "Perubahan adalah selisih dari keadaan awal menuju keadaan akhir.",
    ("MLT", "end"): "Mulailah dari keadaan awal, lalu tambahkan setiap perubahan satu per satu.",
    ("CMP", None): "Selisih berarti seberapa jauh jarak dua nilai. "
    "Ambil nilai yang lebih besar, lalu kurangi dengan nilai yang lebih kecil.",
    ("CMB", None): "Total berarti semua untung dan rugi digabungkan (dijumlahkan).",
    ("RPT", None): "Kata 'setiap' berarti perubahannya terjadi berulang dengan besar yang sama. "
    "Perkalian adalah penjumlahan berulang.",
    ("RPT", "end"): "Keadaan akhir = keadaan awal + (banyak kali × perubahan setiap kali). "
    "Kerjakan perkaliannya lebih dulu.",
    ("MLT", "change"): "Keadaan awal + perubahan pertama + perubahan kedua = keadaan akhir. "
    "Perubahan kedua belum diketahui. Mulailah dari keadaan akhir, lalu kurangi dengan "
    "keadaan awal dan perubahan pertama.",
    ("PRT", None): "Dibagi rata berarti jumlah seluruhnya dibagi banyaknya bagian. "
    "Pembagian adalah kebalikan perkalian.",
    ("PRT", "mixed"): "Gabungkan dulu semua untung dan rugi menjadi satu hasil. "
    "Lalu bagi hasil itu dengan banyaknya orang.",
    ("SCR", None): "Hitung poin dari setiap kejadian: banyaknya × poinnya. "
    "Lalu jumlahkan semuanya. Kejadian yang bernilai nol tidak perlu dihitung.",
}

ASKED_STRATEGY = {
    ("CHG", "start"): "Yang ditanyakan adalah keadaan mula-mula, sebelum berubah.",
    ("CHG", "change"): "Yang ditanyakan adalah besar dan arah perubahannya.",
    ("CHG", "end"): "Yang ditanyakan adalah keadaan terakhir, sesudah berubah.",
    ("MLT", "end"): "Yang ditanyakan adalah keadaan terakhir, sesudah semua perubahan.",
    ("CMP", None): "Yang ditanyakan adalah selisih kedua nilai.",
    ("CMB", None): "Yang ditanyakan adalah total semuanya.",
    ("RPT", None): "Yang ditanyakan adalah perubahan seluruhnya.",
    ("RPT", "end"): "Yang ditanyakan adalah keadaan terakhir, sesudah perubahan berulang.",
    ("MLT", "change"): "Yang ditanyakan adalah besar dan arah perubahan kedua.",
    ("PRT", None): "Yang ditanyakan adalah bagian untuk satu orang atau satu kali.",
    ("PRT", "mixed"): "Yang ditanyakan adalah bagian untuk satu orang.",
    ("SCR", None): "Yang ditanyakan adalah skor akhir.",
}

MIX_RULE = (
    "Ingat urutan operasi: perkalian dan pembagian dikerjakan lebih dulu, "
    "baru penjumlahan dan pengurangan."
)
PAREN_RULE = "Tanda kurung dikerjakan paling dulu. Setelah itu baru perkalian atau pembagian."

# Numeric problems with several operations: no single jump picture, so the
# level-2 hint is a structured text instead of a visual.
NO_PICTURE = {"MIX", "MIX2", "ADD3", "MUL3", "DIST", "DIV2"}

PROPERTY_MEANING = {
    "ADD3": "Sifat komutatif dan asosiatif: urutan dan kelompok penjumlahan boleh diubah. "
    "Cari dua bilangan yang mudah dijumlahkan, misalnya hasilnya puluhan.",
    "MUL3": "Sifat komutatif dan asosiatif: urutan dan kelompok perkalian boleh diubah. "
    "Cari dua bilangan yang hasil kalinya puluhan.",
    "DIST": "Ada pengali yang sama di dua perkalian. Sifat distributif: "
    "a × b + a × c = a × (b + c).",
    "DIV2": "Pembagian tidak asosiatif. Kerjakan berurutan dari kiri ke kanan.",
}


@dataclass(frozen=True)
class HintView:
    """Everything a hint may use. Deliberately has no `answer` field."""

    template: Template
    context: Context
    givens: dict[str, int]
    text: str
    keywords: list[dict]


def _relation_key(template: Template) -> tuple[str, str | None]:
    key = (template.schema_type, template.unknown)
    return key if key in RELATION_MEANING or key in ASKED_STRATEGY else (template.schema_type, None)


def _signed_keywords(view: HintView) -> list[dict]:
    return [k for k in view.keywords if k["sign"] in SIGN_WORDS]


def make_hint(view: HintView, step: str, level: int) -> dict:
    if level == 1:
        hint = {"kind": "meaning", "text": _meaning(view, step)}
    elif level == 2:
        hint = {"kind": "visual", **_visual(view, step)}
    elif level == 3:
        hint = {"kind": "strategy", **_strategy(view, step)}
    else:
        raise ValueError("hint level must be 1, 2 or 3")
    hint.setdefault("visual", None)
    hint.setdefault("template", None)
    hint.setdefault("highlight", None)
    return {"step": step, "hint_level": level, **hint}


# ------------------------------------------------------------------ level 1


def _meaning(view: HintView, step: str) -> str:
    t = view.template
    if step == "known":
        count = NUMBER_WORDS.get(len(t.given), "beberapa")
        return (
            f"Ada {count} bilangan penting di soal. Untuk setiap bilangan, perhatikan kata "
            "di dekatnya: naik atau turun? Di atas atau di bawah?"
        )
    if step == "asked":
        return "Cari kalimat yang diakhiri tanda tanya (?). Kalimat itulah yang ditanyakan."
    if step == "model":
        return RELATION_MEANING.get(_relation_key(t), "Pikirkan hubungan antarbilangan di soal.")
    if step == "result":
        if t.kind == "represent":
            return "Cari kata kunci yang menunjukkan arah: di atas atau di bawah? Naik atau turun?"
        if t.schema_type in PROPERTY_MEANING:
            return PROPERTY_MEANING[t.schema_type]
        if t.schema_type in {"MIX", "MIX2"}:
            return PAREN_RULE if "(" in t.model else MIX_RULE
        op = first_operation(parse(t.model), view.givens)
        if op is None:
            return "Pikirkan arti setiap bilangan di soal."
        if op[0] is ast.Add:
            return "Lihat tanda kedua bilangan. Apakah tandanya sama atau berbeda?"
        if op[0] is ast.Sub:
            return "Ingat: mengurangi sebuah bilangan sama dengan menambah lawannya."
        if op[0] is ast.Mult:
            return (
                "Perkalian adalah penjumlahan berulang. "
                "Lihat juga tanda kedua bilangan: sama atau berbeda?"
            )
        return (
            "Pembagian adalah kebalikan perkalian. Bilangan berapa yang jika dikali "
            "pembagi menghasilkan bilangan yang dibagi?"
        )
    # interpret
    meaning = view.context.meaning
    return (
        f"Hasil positif berarti {meaning.get('pos', 'bertambah')}. "
        f"Hasil negatif berarti {meaning.get('neg', 'berkurang')}."
    )


# ------------------------------------------------------------------ level 2


def _visual(view: HintView, step: str) -> dict:
    if step == "asked":
        return {"text": "Kalimat yang disorot adalah pertanyaannya.", "highlight": view.template.question}
    if view.template.schema_type in NO_PICTURE:
        # several operations at once: a single jump picture would mislead
        return {"text": _structure_text(view)}
    script = visual_script.hint(view.template, view.context, view.givens)
    texts = {
        "known": "Perhatikan arah panahnya. Panah biru ke arah positif, panah merah ke arah negatif.",
        "model": "Lihat gambarnya. Di mana keadaan awalnya, dan ke mana arah perubahannya?",
        "result": "Bayangkan gerakannya pada gambar. Kamu juga bisa mencoba dengan tombol panah.",
        "interpret": "Perhatikan garis nol. Hasilmu berada di sisi positif atau negatif?",
    }
    if view.template.kind == "represent":
        texts["result"] = "Perhatikan garis nol pada gambar. Posisinya di atas atau di bawah nol?"
    elif view.template.schema_type == "MUL":
        texts["result"] = "Lihat panahnya. Lompatan yang sama diulang beberapa kali. Ke mana arahnya?"
    elif view.template.schema_type == "DIV":
        texts["result"] = (
            "Berapa kali lompatan itu diulang sampai ke tujuan? "
            "Jika arah lompatan berlawanan dengan tujuan, hasilnya negatif."
        )
    elif view.template.schema_type == "PRT":
        texts["result"] = "Bayangkan hasil seluruhnya dipotong menjadi bagian-bagian yang sama besar."
    return {"text": texts.get(step, texts["model"]), "visual": script}


def _structure_text(view: HintView) -> str:
    st = view.template.schema_type
    if st in {"MIX", "MIX2"}:
        if "(" in view.template.model:
            return "Tandai dulu bagian di dalam kurung. " + PAREN_RULE
        return "Tandai dulu bagian perkalian dan pembagian. " + MIX_RULE
    if st == "DIV2":
        return "Tandai pembagian pertama dari kiri. Hitung itu dulu, baru pembagian berikutnya."
    if st == "DIST":
        return "Lingkari pengali yang muncul dua kali. Bilangan lainnya bisa dijumlahkan dulu."
    return "Coba pasangkan bilangan yang hasilnya puluhan. Urutannya boleh ditukar."


# ------------------------------------------------------------------ level 3


def _keyword_rules(view: HintView) -> str:
    rules = [
        f"Kata '{k['phrase']}' berarti bilangan {SIGN_WORDS[k['sign']]}."
        for k in _signed_keywords(view)[:3]
    ]
    if not rules:
        return "Bilangan tanpa kata 'di bawah', 'turun', atau 'rugi' adalah bilangan positif."
    return " ".join(rules)


def _strategy(view: HintView, step: str) -> dict:
    t = view.template
    th = view.context.thousands
    if step == "known":
        return {"text": _keyword_rules(view) + " Tulis tanda + atau − di depan setiap bilangan."}
    if step == "asked":
        return {"text": ASKED_STRATEGY.get(_relation_key(t), "Baca lagi kalimat tanyanya.")}
    if step == "model":
        node = parse(t.model)
        names = names_in_order(node)
        blank = {names[-1]} if names else set()
        return {
            "text": "Lengkapi kotak kosong pada kalimat matematika ini.",
            "template": render(node, view.givens, blanks=blank, thousands=th),
        }
    if step == "result":
        if t.kind == "represent":
            return {"text": _keyword_rules(view) + " Tulis tandanya dulu, lalu angkanya."}
        g = {k: fmt_operand(v, th) for k, v in view.givens.items()}
        if t.schema_type == "ADD3":
            return {
                "text": "Kelompokkan bilangan yang mudah dulu, lalu tambahkan sisanya.",
                "template": f"({g['a']} + {g['c']}) + {g['b']} = □ + {g['b']}",
            }
        if t.schema_type == "MUL3":
            return {
                "text": "Kalikan pasangan yang hasilnya puluhan dulu. Tanda: hitung banyak bilangan negatif.",
                "template": f"({g['a']} × {g['c']}) × {g['b']} = □ × {g['b']}",
            }
        if t.schema_type == "DIST":
            return {
                "text": "Satukan dengan sifat distributif. Hitung isi kurung dulu.",
                "template": f"{g['a']} × ({g['b']} + {g['c']}) = {g['a']} × □",
            }
        node = parse(t.model)
        op = first_operation(node, view.givens)
        if op is None:
            return {"text": "Hitung langkah demi langkah dari kiri ke kanan."}
        kind, a, b = op
        if kind is ast.Add and (a > 0) == (b > 0):
            sign = "negatif (−)" if a < 0 else "positif (+)"
            text = (
                f"Tanda sama: jumlahkan {fmt_int(abs(a), th)} + {fmt_int(abs(b), th)}, "
                f"lalu beri tanda {sign}."
            )
        elif kind is ast.Add:
            big, small = max(abs(a), abs(b)), min(abs(a), abs(b))
            text = (
                f"Tanda berbeda: hitung {fmt_int(big, th)} − {fmt_int(small, th)}, lalu ikuti "
                "tanda bilangan yang nilainya lebih besar."
            )
        elif kind is ast.Sub:
            text = (
                f"Ubah menjadi penjumlahan: {fmt_operand(a, th)} + {fmt_operand(-b, th)}. "
                "Lalu gunakan aturan penjumlahan."
            )
        else:
            symbol = "×" if kind is ast.Mult else ":"
            text = (
                f"Hitung {fmt_int(abs(a), th)} {symbol} {fmt_int(abs(b), th)}, lalu tentukan "
                "tandanya: tanda sama → positif, tanda berbeda → negatif."
            )
        if count_operations(node) > 1:
            text += " Setelah itu, lanjutkan dengan bilangan berikutnya."
        return {"text": text}
    unit = view.context.unit or "yang sesuai"
    return {
        "text": f"Tulis hasilmu dengan satuan {unit} dan kata yang tepat, "
        "misalnya 'di atas' atau 'di bawah', 'naik' atau 'turun'."
    }
