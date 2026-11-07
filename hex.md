# HEX Rehberi — Karma TFT

Bu dosya projenin ortak hex dilidir. Hex ile ilgili her şey burada tanımlıdır.
Başka bir ajana "hex" ile ilgili bir görev verildiğinde önce bu dosya okunmalıdır.
Amaç: koordinat vermek/almak sırasında detaylı tarif yazmadan tek satırlık
referans kodlarıyla anlaşmak.

---

## 1. Hex Nedir?

Altıgen şeklinde, üstte tepe noktası olan (pointy-top) CSS kırpma alanıdır.
TFT'de bir oyun tahtası hücresini temsil eder. Projede 4 farklı ölçekte kullanılır:

| Bağlam | Dosya | Boyut (px) | Kullanım |
|---|---|---|---|
| Planner tahtası | `css/planner.css` | 80 × 90 | Ana oyun tahtası (28 slot) |
| Meta mini-board | `css/meta.css` | 70 × 82 | Meta modal içindeki komp tahtası |
| Meta unit-hex | `css/meta.css` | 66 × 76 | Şampiyon ikonu, yıldız üste taşar |
| Trait side-panel | `css/traits.css` | 42 × 46 | Özellik ikonu hex'leri |

**Ortak clip-path (tüm hex'lerde aynı):**

```css
clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
```

Bu değer değiştirilirse tüm referans noktaları yüzde tabanlı olduğu için
geometri korunur ama görsel boyutlar kontrol edilmelidir.

---

## 2. Tahta Koordinat Sistemi

Tahta **4 satır × 7 kolon = 28 hücre** içerir.

| Gösterim | Açıklama | Örnek |
|---|---|---|
| `sira` (1-4) | Satır numarası (1 = en üst, 4 = en alt) | `sira: 3` |
| `slot` (1-7) | Kolon numarası (1 = en sol, 7 = en sağ) | `slot: 6` |
| `pos` / `slot-id` (0-27) | Tek sayı; satır 7'ye bölünerek elde edilir | `pos: 18` |
| `R{sira}C{slot}` | Sembolik gösterim | `R3C6` |

**Dönüşüm formülü (projede standart):**

```
pos = (sira - 1) × 7 + (slot - 1)
sira = floor(pos / 7) + 1
slot = pos % 7 + 1
```

`data/comps.json` içindeki her birimde `sira` ve `slot` bulunur.
Planner'da `slot-${pos}` id'leri kullanılır; meta mini-board aynı formülle
çizilir (`js/meta.js` → `getCompPosition`).

> Geçerli aralık: `sira` 1-4, `slot` 1-7. Bu aralık dışı değerler tahta dışına
> düşer ve görünmez. Komp verilerinde "Taş Kabuk" (1. satır) ve "Çançiçeği"
> (4. satır) gibi summon'lar da normal hücre mantığıyla yerleştirilir.

---

## 3. Hex İçi Referans Noktaları (Numara Haritası)

Her hex kendi içinde **6 köşe noktası** üzerinden adreslenir. Bu ortak dil bir
hex'in içini ve dışına taşan kısmını tek satırla ifade eder.

```
              1
             / \
            2   3
            |   |
            4   5
             \ /
              6
```

### 3.1 Köşe Noktaları (Vertex) — `V1` ... `V6`

| Nokta | Ad | Konum (%) | Piksel (80×90) | CSS clip-path sırası |
|---|---|---|---|---|
| `V1` | üst tepe | (50%, 0%) | (40, 0) | 1. nokta |
| `V2` | sol-üst | (0%, 25%) | (0, 22.5) | 6. nokta |
| `V3` | sağ-üst | (100%, 25%) | (80, 22.5) | 2. nokta |
| `V4` | sol-alt | (0%, 75%) | (0, 67.5) | 5. nokta |
| `V5` | sağ-alt | (100%, 75%) | (80, 67.5) | 3. nokta |
| `V6` | alt taban | (50%, 100%) | (40, 90) | 4. nokta |

### 3.2 Kenar Orta Noktaları (Edge Midpoint) — `E{a}{b}`

İki köşe arasındaki çizginin **tam orta noktası**. `E` + iki köşe numarası:

| Kod | Kenar | Yön | Konum (%) |
|---|---|---|---|
| `E12` | V2 → V1 (sol-üst) | `/` | (25%, 12.5%) |
| `E13` | V1 → V3 (sağ-üst) | `\` | (75%, 12.5%) |
| `E24` | V2 → V4 (sol dikey) | `\|` | (0%, 50%) |
| `E35` | V3 → V5 (sağ dikey) | `\|` | (100%, 50%) |
| `E46` | V4 → V6 (sol-alt) | `\` | (25%, 87.5%) |
| `E56` | V5 → V6 (sağ-alt) | `/` | (75%, 87.5%) |

> Yön keyfi değildir: `/` ve `\` işaretleri ekranda çizilen eğimle birebir
> aynıdır. `E46` = "4 ve 6'yı bağlayan \ yolunun ortası" demektir.

### 3.3 Bölgeler (İç Yerleşim)

| Kod | Ad | Kullanım |
|---|---|---|
| `C` | Merkez | Hex'in tam ortası — karakter adı, ikon gibi iç öğeler |
| `T` | Üst bölge | Hex'in üst yarısı, V1'e yakın |
| `B` | Alt bölge | Hex'in alt yarısı, V6'ya yakın (ör. isim etiketi altta) |
| `S` | Üst üstü | Hex dışına taşan, V1 üstüne binen — yıldız satırı |

---

## 4. Tam Koordinat Söz Dizimi

```
R{sira}C{slot} {Referans}
```

| Örnek | Anlam |
|---|---|
| `R3C6 V6` | 3. satır 6. kolon hex'inin 6. noktası (alt taban) |
| `R1C4 E46` | 1. satır 4. kolon hex'inin alt-sol kenar ortası |
| `R4C5 S` | 4. satır 5. kolon hex'inin dışına taşan üst-üstü yıldız bölgesi |
| `R2C3 C` | 2. satır 3. kolon hex merkezi |
| `R3C2 B` | 3. satır 2. kolon hex alt bölgesi |

Esnek kullanım: Dikdörtgen tahta dışı ama hex gösterimi gereken kısayollarda
yalnızca `V/E/C/T/B/S` de kullanılabilir. "1. nokta" = `V1`, "1-2 yolu" = `E12`
ile birebir eşleşir.

---

## 5. Yerleşim Kuralları

Projede öğeler (küçük hex, yıldız, rozet, badge, isim) hex'in **içinde** veya
**dışına taşacak** şekilde yerleşebilir:

**İç öğeler** — kolay:
- Karakter adı → `C`
- Cost çerçevesi, isim etiketi altta → `B`
- Sayı/ikon ortada → `C`

**Dışa taşan öğeler (çivileme)**:
- Referans noktasına yerleştirilen öğenin **merkezi**, o referans noktasını
  ortalayacak şekilde konumlanır (`transform: translate(-50%, -50%)` tabanlı).
- `V1`-`V6` ve `E12`-`E56` noktaları bir hex'in sınırına oturur; öğe hex'in
  hem içine hem dışına taşabilir. Buna **çivileme (pinning)** denir.
- Örnekler:
  - `E46` ve `E56` ortasına küçük hex oturtulur → hex'in alt tarafına bakan
    bir zincir görünümü.
  - `E12` / `E13` / `V1` üzerine yıldız oturtulur → hex üstünde rozet.
  - Tam dikey kenar `E24` ortasına başka bir küçük hex asılabilir → sol-orta
    kenara yapışık çift görünüm.

> **Yıldız dağılım kuralı:** Meta modalındaki yıldızlar (şampiyon yıldız seviyesi)
> hex referans noktalarına çivileme ile dağıtılır — her yıldızın merkezi o
> noktayı ortalartar. 1★ → `V1` (merkezlenmez; yıldızın **üst kenarı** V1'in
> 5px üstüne taşar — anchor `offsetY: "-5"` ile inline
> `transform: translate(-50%, -5px)`).
> 2★ → `E12` + `E13` (tepe boş, iki üst kenar
> ortası dolu). 3★ → `E12` + `V1` + `E13` (ortadaki V1 yıldızı da 1★ gibi
> üst kenarı V1'e oturur — her üç yıldız aynı üst hizada). Yıldız boyutu 22px'tir; 1-2★ gri
> (`#9aa3b2`), 3★ sarı (`#f2cf8a`) — `meta-star-1/2/3` sınıflarıyla.
> Uygulama: `.meta-m-star` (mini-board) ve `.meta-unit-hex-star` (unit strip)
> sınıfları `--rx` / `--ry` custom property'leriyle konumlanır
> (`left/top: var(--rx)/var(--ry)` + `translate(-50%,-50%)`). V1'deki yıldız
> hex dışına taşabilsin diye mini-board slotu clip-path taşımaz; cost renkli
> arka plan yalnızca `.meta-m-slot::before` hex katmanındadır (slot'un kendi
> arka planı transparent bırakılır — asla dikdörtgene çıkılmaz).
> Planner'da ise çivileme kullanılmaz: her dolu slotun üst-orta bölgesinde
> 3 yıldızlı rating çubuğu (`.planner-star-picker`, top: -8px) daima görünür.
> Tıklama ile `champ.yildiz` o değere set edilir ve seçilen + önceki tüm
> yıldızlar kalıcı yanık kalır (hover önizlemesi yok). Planner slotu **kendi
> `clip-path`'ini taşımaz**: hex görseli,
> cost rengi ve `clip-path` içteki `.comp-champ-hex` katmanındadır; yıldız
> çubuğu bu katmanın kardeşi olduğundan hex'in DİŞINA taşabilir ve hex
> çerçevesini (border) bozmaz. Ortak anchor üreticisi `getStarAnchors` hâlâ
> `js/utils.js` içindedir (meta tarafından kullanılır).
>
> **Eşya zinciri kuralı:** Şampiyona takılı eşyalar hex'in **alt** bölgesine
> yerleşir; **dağılım eşya SAYISINA göre değişir**:
> 1 eşya → `V6` (orta), 2 eşya → `E46` + `E56` (sol+sağ, orta boş),
> 3 eşya → `E46` + `V6` + `E56` (hepsi) — yani 1. eşya 1. yuvaya,
> 2. eşya 2.ye, 3. eşya 3.ye. `V6` yuvası tam merkeze oturmaz; inline
> `transform: translate(-50%, -75%)` ile **biraz yukarıda** durur (`V6`
> noktasının ~%10 kadar üstüne çekilir). Her eşya yuvası **eşyanın takılı
> olduğu karakterin cost rengini** kullanan küçük bir hex'tir
> (`cost-border-N` sınıfı, yalnız `background: var(--cN)` — kare border yok;
> 30px meta tarafı, 36px planner tarafı) ve içinde bir adım küçük eşya
> avatarı (`img/items/{id}.avif`; 21/26px) → img ile hex kenarı arasındaki
> cost renkli şerit **sahte border** oluşturur (kutu + küçük fotoğraf). Dağılım üreticisi `getItemLayout`
> `js/utils.js` içindedir; meta tarafı (`meta-unit-hex-item`, `meta-m-item`)
> salt okunur gösterim, planner tarafı (`planner-item-slot`) interaktiftir:
> **Planner eşya sistemi (drag & drop):** Eşya panelindeki kartlar
> (`data-id` + `draggable`) sürüklenip dolu şampiyon slotuna bırakılınca
> hedef `champ.items` dizisine eklenir (max 3). **Aynı eşyadan birden fazla
> kopya eklenebilir** (ör. 3× Warmog; kopyalar birbirini silmez): panelden
> gelen drag kaynaktan sökme yapmaz, yalnızca ekler. Champ üzerindeki eşyalı
> yuvadan sürüklenen eşyalar `item-origin` taşır: **boş alana/boş slota**
> bırakılmayla o şampiyonun bir kopyası kaldırılır (`removeItemFromAnywhere`);
> **başka şampiyona** bırakılınca kaynaktan tek kopya silinip hedefe eklenir.
> Her eşya sürüklemesi başladığında açık tooltip kapatılır
> (`hideAllTooltips`, hem panel kartında hem yuvadaki eşyada). Sürükleme
> sırasında hex önizlemesi GÖSTERİLMEZ (`slot-hover` yalnız şampiyon
> taşırken eklenir); sıralama yalnız bırakma anında uygulanır. Veri:
> `champ.items` (id dizisi, max 3); comps verisinde aynı amaçlı alan adı
> `esyalar`'dır (`loadCompIntoTeam` bunu `items`'e çevirir; meta modalda
> `buildPlacedUnits` `esyalar`'ı birimlere taşır ve "Kompu Düzenle"
> `esyalar`'ı champList'e ekler). Örnek: Malphite AP Flex'teki
> Malphite → `gargoyltaszirhi`, `warmogunzirhi`, `kraliyetbasligi`
> (3 eşya → tam zincir). Modalde tank rozeti alt zincirle çakışmaması için
> biraz üstte durur (`.meta-tank-tag` bottom: 22px).

---

## 6. Örnek Senaryolar

Kullanıcı komutlarının çevirisi:

| Doğal dil tarifi | Standart kod |
|---|---|
| "4 ve 6'yı bağlayan yolun ortasına hex" | `E46` |
| "5 ve 6'nın yolunun ortasına hex" | `E56` |
| "1. noktaya yıldız" | `V1` |
| "1 ve 2 yoluna yıldız" | `E12` |
| "1 ve 3 yoluna yıldız" | `E13` |
| "dikey 2-4 yoluna hex" | `E24` |
| "hex'in tam ortasına isim" | `C` |
| "hex'in alt kısmına isim" | `B` |

**Ters yön notu:** `E12` yıldız için, `E13` yıldız için kullanılır; aynı kod
üzerine istenilen öğe (hex, yıldız, badge) yerleştirilebilir — öğe tipi
referansı değiştirmez, sadece konumu belirler.

---

## 7. Teknik Notlar

- Tüm referans konumları **yüzde tabanlı**dır (clip-path ile aynı uzay).
  Bu sayede 42×46'lık trait hex'inden 80×90'lık planner hex'ine kadar aynı
  kod geçerlidir.
- Sıra hizalaması: planner'da `margin-top: -14px`, çift satırlar
  `translateX(45px)`; meta mini-board'da `translateX(39px)`. Satırlar
  birbirine kenetlidir, ofset iki satır arası yatay kaymayı sağlar.
- `data/comps.json` birimleri `sira`/`slot` taşır; JS tarafında `pos`'a
  çevrilir. Veri girerken `sira` 1-4, `slot` 1-7 aralığı **zorunludur**.
- Summon'lar: "Taş Kabuk" (sira 1), "Çançiçeği" (sira 4) normal hücre
  kurallarıyla yönetilir; `planner.js`'de `freeSlot` ile işaretlenir ve
  takım sayacına dahil edilmez.

---

*Bu rehber, hex'i tasarlayan kullanıcı ile kod uygulayıcı ajanlar arasındaki
ortak dildir. Yeni bir hex öğesi eklerken önce buradaki referanslar kullanılmalı,
yeni referans tanımı gerekiyorsa bu dosyaya eklenip güncellenmelidir.*