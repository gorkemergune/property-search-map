# Araştırma Raporu: Harita ve Filtrelerle Emlak Arama

- **Proje:** Iceberg X Ar-Ge stajı, "Property Search With Map & Filters" (frontend POC)
- **Tarih:** 2026-10-07
- **İngilizce sürüm:** [research-report.en.md](research-report.en.md)

**Yöntem.** Ham HTML ve JavaScript paketleri `curl` ile indirildi (masaüstü ve iPhone user-agent'ı ile). Harita kütüphaneleri; script etiketleri, sayfaya gömülü veri (`__NEXT_DATA__`) ve paketlerin içindeki kütüphane kodundan tespit edildi. Bazı eksikler WebFetch ve web aramasıyla tamamlandı. Kütüphane sürümleri npm registry'den okundu. **Güncelleme (aynı gün): Playwright 1.49.1 kontrolleri.** Her sitenin harita arama sayfası headless Chromium'da masaüstü 1440×900, telefon 390×844 (iPhone 13 profili) ve tablet 820×1180 (iPad Pro 11 profili) ile, ayrıca Firefox ve WebKit'te masaüstü boyutunda açıldı. Bunlar **headless tarayıcılarda emüle edilmiş viewport'lar, gerçek cihaz değil**. Site başına en fazla 5–8 sayfa yüklemesi yapıldı. Yalnızca "reddet/yalnızca gerekli" çerez butonlarına tıklandı. Giriş yapılmadı, captcha çözülmedi, engelden sonra yeniden denenmedi. Ekran görüntüleri `docs/presentation/shots/` içinde (git-ignore'da).

---

## 1. Özet

- **Büyük portallar Google Maps kullanıyor; Leaflet kullanan tek site OpenRent.** Rightmove ve OnTheMarket, Google Maps'i `@vis.gl/react-google-maps` ve `AdvancedMarkerElement` ile kullanıyor. Zillow, Airbnb ve Zoopla, Google Maps JS API'sini yüklüyor (Playwright ile çalışma anında doğrulandı). OpenRent ise Leaflet 1.5.1 + `leaflet.markercluster` ve MapTiler raster karolarını kullanıyor. → Leaflet bu tür bir arayüz için denenmiş bir seçim ve API anahtarı gerektirmiyor.
- **Öneri: Leaflet 1.9.4 + react-leaflet 5.0.0.** react-leaflet 5, **React 19 gerektiriyor**. Lisansı **Hippocratic-2.1** (OSI onaylı değil); mentöre bildirilmeli. Leaflet 2.0 hâlâ alfa sürümünde, bu yüzden 1.9.x'te kalınmalı.
- **CARTO bir filtreleme aracı değil, bir CBS/konum zekâsı platformu.** Bizim için tek kullanımı ücretsiz altlık harita karoları. CARTO altlık haritaları **artık API anahtarı istiyor** (anahtar olmadan karolarda "API key required" filigranı çıkıyor). "© OpenStreetMap contributors, © CARTO" atfı zorunlu.
- **OSM'nin kendi karoları (`tile.openstreetmap.org`) düşük trafikli bir POC için uygun**, atıf görünür olduğu sürece. SLA yok; toplu/çevrimdışı önden indirme yasak. Sağlayıcı değiştirebilmek için karo URL'si config'de tutulmalı.
- **Fiyat filtresi her zaman ilan moduna bağlı.** Satılık = toplam fiyat, hazır adımlarla. Kiralık = aylık; isteğe bağlı haftalık geçişi (OpenRent, Zoopla) veya "aylık ödeme" (Zillow) var. Airbnb = N gece için toplam fiyat. Min/max kullanan her site min > max durumunu engelliyor.
- **Ortak vurgu sözlüğü küçük:** bir yenilik/fiyat değişikliği rozeti ("Added today", "Reduced", "Price cut"), bir ücretli öne çıkarma rozeti ("Featured", "Premium", "Spotlight", "Showcase"), bir durum etiketi (Under offer / Let agreed / Sold STC) ve medya sayıları (fotoğraf, 3D tur, kat planı).
- **Pratikte harita ↔ liste senkronu:** Rightmove, fiyat pinleri ve kümeler üzerinde `hover`, `selected` ve `visited` durumlarını izliyor. OpenRent, liste kartının üzerine gelince haritadaki işaretçiyi vurguluyor. Rightmove'da harita hareket edince "Search this area" butonu çıkıyor; Airbnb ve Zillow harita sınırlarını arama parametresi olarak gönderiyor.
- **POC kararı:** filtre çubuğu (konum metni, hazır adımlı min/max fiyat, tür, "N+" yatak odası, durum); masaüstünde anında uygulanır, mobilde "Uygula / N sonucu göster" butonlu modal; aktif filtre çipleri + "Tümünü temizle"; fiyat balonu işaretçiler (`L.divIcon`); kartlar ile işaretçiler arasında hover/selected senkronu.

---

## 2. Harita teknolojisi

### 2.1 Kütüphane karşılaştırması

|                                      | **Leaflet + react-leaflet**                                                                  | **MapLibre GL JS** (+ react-map-gl)                        | **Mapbox GL JS** (+ react-map-gl)                                                       | **Google Maps JS** (+ @vis.gl/react-google-maps)                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Son sürüm (npm, 2026-10-07)        | leaflet 1.9.4 (2023-05-18), 2.0.0-alpha.1; react-leaflet 5.0.0                                     | maplibre-gl 6.13.0; react-map-gl 8.1.3                           | mapbox-gl 3.32.0                                                                              | @vis.gl/react-google-maps 1.10.1                                                                            |
| Lisans                               | Leaflet BSD-2-Clause;**react-leaflet Hippocratic-2.1**                                       | BSD-3-Clause                                                     | **Özel lisans** (Mapbox TOS, v2+); aktif Mapbox hesabı gerekir                        | Özel servis; wrapper MIT                                                                                   |
| API anahtarı / hesap                | Yok (karo sağlayıcısı isteyebilir)                                                             | Kütüphane için yok; karo/stil kaynağına bağlı             | Access token + Mapbox hesabı                                                                 | API anahtarı. Prototip için faturasız "Maps Demo Key" var; production için faturalandırma gerekir      |
| Maliyet                              | Kütüphane ücretsiz; karolar sağlayıcı limitleri içinde ücretsiz                            | Kütüphane ücretsiz                                            | Ayda 50.000 harita yüklemesine kadar ücretsiz, sonra 1.000 başına $5,00 (50.001–100.000) | Dynamic Maps için ayda 10.000 ücretsiz faturalanabilir olay, sonra 1.000 başına $7,00 (100.000'e kadar) |
| Render                               | DOM/SVG/Canvas, raster karolar                                                                     | WebGL, vektör karolar                                           | WebGL, vektör karolar                                                                        | Google tarafından render edilen vektör/raster                                                             |
| React entegrasyonu                   | `MapContainer`, `Marker`, `Popup`, `useMap`; tipler `@types/leaflet` ile                 | `react-map-gl/maplibre`                                        | `react-map-gl/mapbox`                                                                       | `APIProvider`, `Map`, `AdvancedMarker` (Rightmove/OTM bunu kullanıyor)                               |
| Kümeleme                            | `react-leaflet-cluster` 4.1.3 (peer: react-leaflet ^5, React ^19) veya `leaflet.markercluster` | Dahili GeoJSON kaynak kümelemesi veya`supercluster`           | MapLibre ile aynı                                                                            | `@googlemaps/markerclusterer` veya `supercluster` (Rightmove tarzı)                                    |
| Özel HTML işaretçi (fiyat balonu) | Kolay: HTML/CSS ile`L.divIcon`                                                                   | Mümkün (HTML'li`Marker`); binlerce HTML işaretçi yavaşlar | MapLibre ile aynı                                                                            | React children ile`AdvancedMarker`                                                                        |
| Performans                           | Yüzlerce DOM işaretçi için iyi; binlercesi kümeleme ister                                     | Büyük veri için en iyisi (GPU)                                | Büyük veri için en iyisi (GPU)                                                             | İyi; sağlayıcı yönetiyor                                                                               |
| POC'ye uygunluk                      | **En iyisi:** anahtar yok, en basit API, brief'e uyuyor                                      | Vektör stil gerekirse iyi bir alternatif                        | Değmez: token + özel lisans                                                                 | Değmez: anahtar + faturalandırma, sağlayıcıya bağımlılık                                           |

Kanıt: npm registry (sürümler, lisanslar, peer bağımlılıklar). Mapbox lisans metni `mapbox-gl@3.32.0/LICENSE.txt` dosyasından. Fiyatlar mapbox.com/pricing ve Google fiyatlandırma sayfasından. API anahtarı kuralları Google'ın "get API key" sayfasından.

### 2.2 Öneri

**Leaflet 1.9.4 + react-leaflet 5.0.0** (+ `@types/leaflet`). `react-leaflet-cluster`'ı yalnızca mock veri temiz render edilemeyecek kadar büyürse ekleyin. Bu eşiği ölçmedik.

Onaylanması gerekenler:

- react-leaflet 5'in peer bağımlılığı **React ^19**. Vite projesi React 18 ile değil, React 19 ile kurulmalı.
- react-leaflet'in **Hippocratic-2.1** lisansı insan hakları koşulları ekliyor ve OSI onaylı değil. Dahili bir POC için muhtemelen sorun değil, ama kararı mentör vermeli.
- leafletjs.com ana sayfası artık **2.0.0-alpha.1**'i öne çıkarıyor (ESM API, `new TileLayer(...)`). npm'deki `latest` hâlâ 1.9.4 ve react-leaflet `leaflet ^1.9.0` istiyor. 1.9.4 kullanın.
- Leaflet CSS'i import edilmeli; varsayılan işaretçi ikonları bundler'da yol sorunu çıkarır. Bu bilinen bir sorun; `divIcon` kullanarak bundan kaçınıyoruz.

### 2.3 Karo sağlayıcıları ve atıf

| Sağlayıcı                                          | Anahtar                                                             | Ücretsiz limit                                                                                    | Zorunlu atıf                                                                                                                     | Notlar                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OSM standart (`tile.openstreetmap.org`)             | Hayır                                                              | Sayısal limit yok; "yoğun kullanım" haber verilmeden engellenebilir                             | "© OpenStreetMap contributors" + osm.org/copyright bağlantısı; haritada görünür olmalı, arayüzün arkasına gizlenmemeli | SLA yok. Toplu/önden/çevrimdışı indirme yok.`no-cache` başlığı gönderilmemeli. Geçerli bir Referer gönderilmeli (kısıtlayıcı `Referrer-Policy` kullanılmamalı). POC için uygun                                      |
| CARTO altlık haritaları (`basemaps.cartocdn.com`) | **Evet** (ücretsiz, "hesap yok, bir dakikada e-postanızda") | Ticari olmayan: ayda 5M isteğe kadar. Ticari: ayda 1M'ye kadar ücretsiz. Ücretli: $500/ay (10M) | Her haritada "© OpenStreetMap contributors, © CARTO"                                                                            | Anahtar olmadan "API key required" filigranı. 2026-09-23'ten önce alınan anahtarlar 2026-11-30'a kadar çalışır. Koşullar sürümü 2026-09-29. Anahtar sayfasında Voyager doğrulandı; Positron/Dark Matter orada doğrulanmadı |
| MapTiler (OpenRent kullanıyor)                       | Evet                                                                | Kontrol edilmedi                                                                                   | OSM + MapTiler                                                                                                                    | Daha fazla araştırılmadı                                                                                                                                                                                                               |

**CARTO nedir:** kendini "The Agentic GIS Platform" olarak tanımlıyor: mekânsal analiz, veri ambarı üzerinde çalışan uygulamalar, deck.gl görselleştirme. **Frontend filtre bileşeni sunmuyor**. Bizim için tek önemi altlık harita karoları (fiyat işaretçilerini öne çıkaran sade, düşük kontrastlı stil).

**Karar:** geliştirmede atıflı OSM standart karolarını kullanın. Karo URL'si ve atfı tek bir config dosyasında tutun (`src/config/map.ts`). Mentör CARTO görünümünü isterse ücretsiz anahtar alıp `VITE_CARTO_KEY` içinde saklayın. Atıf kontrolünü asla gizlemeyin (OpenRent mobil kart görünümünde `.leaflet-control-attribution`'ı gizliyor; bunu kopyalamayın).

---

## 3. Site bazlı analiz

### 3.1 OnTheMarket (onthemarket.com)

1. **Vurgular:** her kartta bir `main-label` var ("Added today", "Reduced today", "Spotlight Property", "3D tour"). İşaretler: `premium?`, `exclusive?`, `spotlight?`, `matterport-virtual-tour?`. İkon etiketleri ("Greener choice", "Accessible features"). Fiyatın yanında niteleyici ("Guide price", "Offers over", "Offers in excess of", "Shared ownership"). `short-price` alanı ("£475k") mevcut. Yalnızca harita görünümünde işaretçiler **fiyatsız düz gri pinler** (ekran görüntüsü). İşaretçi hover/selected görünümü *doğrulanmadı*.
2. **Harita:** Google Maps. Kanıt: maps.googleapis.com'a `preconnect`, `google.maps.*` çağrıları ve lazy chunk içindeki `@vis.gl/react-google-maps` wrapper'ı (`APIProvider`, `AdvancedMarkerElement`). Poligon "Drawn area" araması var. İncelenen chunk'larda kümeleme kodu bulunmadı. İşaretçi şekli *doğrulanmadı*.
3. **Fiyat filtresi:** hazır adımlar `formData.price-ranges` içinden geliyor: £250k'ya kadar £10k, £500k'ya kadar £25k, £1M'ye kadar £50k, £2.5M'ye kadar £100k adımlar, sonra daha büyük adımlar. Her adımın bir `percent` değeri var, yani ilan dağılımı/histogram. Kiralıkta `priceFrequency: "pcm"`. GBP.
4. **Cihazlar (Playwright, emüle):** yalnızca harita görünümü → masaüstü, telefon ve tablette "List" butonlu tam genişlikte harita. Telefonda filtreler bir arama alanı + ikon butona iniyor; yüzen "Create alert" butonu var. Firefox ve WebKit: aynı düzen (harita boyutu ve konumu aynı). İlk yüklemede çerez paneli çıkıyor.
5. **Filtreler:** yarıçap, fiyat, min/max yatak odası, mülk tipi, büyüklük, "Include under offer/sold STC", let agreed, yeni eklenen/indirimli, yeni konutlar, emeklilik, paylı mülkiyet, açık artırma, evcil hayvan dostu, erişilebilir, çevreci seçim, eşyalı, kira süresi, tapu türü. Varsayılan sıralama `recommended` ve `exclusiveFirst: true`. "Clear all" var. "Map view" geçiş metni var.

### 3.2 Zillow (zillow.com)

1. **Vurgular:** kart başına önceliğe göre seçilen tek bir "flex" rozet: "Showcase" (ücretli; Austin'de 41 kartın 18'i), yenilik ("3 hours ago"), "Price cut: $3,000 (9/17)", "Open: Sat 2-4pm", "3D Tour", "Zillow Preview" veya kısa bir özellik ifadesi ("Sparkling pool"). Durum metni ("Active", "Pending", "Accepting backup offers").
2. **Harita:** Google Maps JS API v3.65 (`<script data-testid="google-map-script-src" ...libraries=places,geometry>`) ve Google Static Maps görselleri. Sorgu state'inde `mapBounds` ve `isMapVisible` var. Playwright (Chromium) çalışma anında `google.maps` 3.65'i doğruladı. İşaretçi stili *doğrulanmadı*: işaretçiler çizilmeden önce bot kontrolü çıktı.
3. **Fiyat filtresi:** iki mod. `price`: liste fiyatı; $1M'ye kadar $50k adımlı hazır değerler, sonra $18M'ye kadar daha büyük adımlar. `monthlyPayment`: $200 adımlı hazır değerler; peşinat/faiz/vade/kredi notu girdileriyle. Etiketler: "$X+", "Up to $Y", "$X-$Y". USD.
4. **Cihazlar:** **engellendi.** iPhone UA ile curl → 403. Playwright Chromium masaüstü → sayfanın üstünde "Before we continue… Press & Hold" bot kontrolü (altında harita ve liste görünüyor). Kurallarımız gereği başka yükleme yapılmadı: telefon, tablet, Firefox ve WebKit *doğrulanmadı*.
5. **Filtreler:** 111 filtre tanımı: fiyat, aylık ödeme, yatak odası ("Any/1+…5+" veya "Studio" dahil tam sayı), banyo, konut tipi, durum, metrekare, arsa, yapım yılı, HOA, Zillow'daki gün sayısı, anahtar kelime, okullar, işe gidiş süresi, birçok kiralık olanağı. Sıralama: "Homes for You" (varsayılan), Newest, Fiyat ↑/↓, Ödeme ↑/↓, Bedrooms, Bathrooms, Square Feet, Lot Size ve diğerleri. `exposedPillEnabled` işaretleri bazı filtrelerin üst çubukta çip olarak gösterildiğine işaret ediyor.

### 3.3 Rightmove (rightmove.co.uk)

1. **Vurgular:** `addedOrReduced` ("Added today", "Added on 05/10/2026", "Reduced on 15/04/2026"). `premiumListing` (8/25), `featuredProperty` (başlık "Featured New Home"). `productLabel` spotlight metni ("Incentives Available"). Lozenge'ler (`NEW_HOME`). Durum metinleri "Under Offer", "Sold STC", "Let Agreed". Medya sayıları (`numberOfImages`, `numberOfFloorplans`, `numberOfVirtualTours`). Fiyat niteleyici ve "POA".
2. **Harita:** `@vis.gl/react-google-maps` üzerinden Google Maps (hata metinleri github.com/visgl/react-google-maps'e bağlanıyor), `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `AdvancedMarkerElement`. **Fiyat pinleri** (`pricePin`: kısaltılmış satış fiyatı, kiralıkta "pcm" eki). Sayılı **küme pinleri** ("Cluster with N properties"), supercluster tarzı bir API'den (`cluster_id`, `point_count_abbreviated`, `getLeaves`). CSS durumları `visitedPin`, `selectedPin`; hover'da z-index artışı (1001'e karşı 1000); pin içinde kaydedildi kalbi. Harita hareket edince üst ortada **"Search this area"** butonu. Düzenlenebilir çizilmiş alanlar (feature switch `EDITABLE_AREAS_ENABLED`).
3. **Fiyat filtresi:** satılık = toplam GBP. Kiralıkta varsayılan `priceType: "pcm"`. Hazır değerlerin tam listesi *doğrulanmadı* (filtre arayüzü chunk'ı indirilen paketlerde yoktu).
4. **Cihazlar (Playwright, emüle):** harita görünümü masaüstü, telefon ve tablette fiyat pinli tam ekran harita; "List view" / "List" butonu var. Telefonda filtreler ikon butona iniyor, "Create alert" ikona dönüşüyor. Her çalıştırmada 96 fiyat işaretçisi çizildi. Firefox ve WebKit: aynı düzen.
5. **Filtreler:** konum + yarıçap, fiyat, yatak odası, mülk tipleri, tapu türü, must-have, don't-show (açık artırma dahil), eşya durumu, anahtar kelime, banyo, taşınma tarihi, sıralama. Ayrı liste (`find.html`) ve harita (`map.html`) sayfaları.

### 3.4 Airbnb (airbnb.com.tr)

1. **Vurgular:** "Misafirlerin favorisi" (sonuçlarda 24) ve "Süper Ev Sahibi" rozetleri. Fiyatta `originalPrice` ile `discountedPrice` (üstü çizili fiyat kalıbı). Hover/selected görünümü *doğrulanmadı*.
2. **Harita:** Google Maps JS API v3.36 (sayfa config'inde `google_maps_url`, `client=gme-airbnbinc`, `libraries=places`). `AdvancedMarker` metinleri var. Arama parametrelerinde harita sınırları (`ne_lat`, `ne_lng`, `sw_lat`, `sw_lng`) ve `search_by_map` var. Harita işaretçileri **yuvarlak fiyat hapları** ("₺8.901"); tüm çalıştırmalarda ekran görüntüsüyle doğrulandı. Çalışma anındaki `google.maps` sürümü 3.63 (config URL'si `v=3.36` istiyor).
3. **Fiyat filtresi:** **histogramlı** kaydırıcı ("Fiyat aralığı"; `priceHistogram` dizisi), min ₺2.500 – max ₺63.000. Alt başlık "Tüm ücretler dâhil seyahat fiyatı"; `price_filter_num_nights: 5` için. Yani fiyat tarihlere/gece sayısına ve para birimine (TRY) bağlı.
4. **Cihazlar (Playwright, emüle):** masaüstü → solda liste, sağda harita. Telefon → **önce harita**, liste alttan açılan panelde. Tablet → **yalnızca liste**, yüzen "Haritayı göster" butonu. Firefox ve WebKit: masaüstü düzeni aynı. Her ilk yüklemede tek seferlik "tüm ücretler dahil" bildirimi ekranın bir kısmını kapatıyor.
5. **Filtreler:** `clearAllFilterKeys` şunları listeliyor: fiyat, oda tipi, yatak odası, yatak, banyo, misafir favorisi, anında rezervasyon, olanaklar, evcil hayvan, mülk tipi, ev sahibi dili, semtler, erişilebilirlik özellikleri. Sayaçlı "Tüm filtreler" butonu → modal kalıbı.

### 3.5 Sahibinden (sahibinden.com)

- **Engellendi.** `curl` ve WebFetch, Cloudflare doğrulama sayfasıyla ("Just a moment...") HTTP 403 aldı.
- Tek kaynak: resmi iOS uygulama açıklaması ("sahibinden.com Emlak"): haritada istediğiniz bölgeyi seçip o bölgedeki ilanları görebilir, sonuçları kriterlere göre daraltabilirsiniz.
- 1–5. maddeler (vurgular, harita teknolojisi, fiyat filtresi, cihazlar, filtre UX'i): **doğrulanmadı**. Gerçek bir tarayıcıda elle kontrol edilmeli.

### 3.6 OpenRent (openrent.co.uk)

1. **Vurgular:** fiyat büyük ve renkli (`fs-4 fw-medium text-primary`), aylık ve haftalık varyantlarıyla. Fotoğraf üzerinde fiyat rozeti. "Last updated around N days ago". "Furnished", "N Bed", "N Bath" gibi rozetler. **Liste kartının üzerine gelince işaretçi vurgulanıyor** (`mouseover .ltc → searchmappingjs.highLightProperty`).
2. **Harita:** **Leaflet 1.5.1** + `leaflet.markercluster` 1.4.0 + `leaflet.fullscreen` + `Leaflet.Editable` (çizim). Karolar: **MapTiler raster**, atıf "© OpenStreetMap, © MapTiler". `L.divIcon` işaretçiler. `markerClusterGroup({chunkedLoading:true, maxClusterRadius:60})`.
3. **Fiyat filtresi:** **aylık / haftalık geçişi** ("Show Rent Per Week"). Min/max için **hazır değerli açılır listeler artı özel değer** (`-1` → metin girişi). Min > max yapacak seçenekler **devre dışı**; "Min price must be less than max price" doğrulama mesajı. GBP.
4. **Cihazlar:** iki UA için de aynı URL. Kodda yatay kart şeritli bir mobil harita modu (`#property-dataMobile`, `scrollLeft`) ve liste/harita görünüm geçişi var. Şerit açıkken atfı gizliyor (OSM politikasına aykırı). **Playwright (emüle):** masaüstü ve tablette filtre paneli haritanın yanında, liste altta. İşaretçiler yarıçap dairesi içinde sayılı küme ikonları. Telefon → **açılışta harita yok**; "Map View" butonu, önce liste. Firefox ve WebKit: aynı düzen. `L.version` 1.5.1 çalışma anında doğrulandı; karolar api.maptiler.com'dan.
5. **Filtreler:** fiyat, min/max yatak odası, min/max banyo, tip (Houses/Flats/Rooms), eşya durumu, müsaitlik tarihi, min kira süresi, öğrenci/aile/evcil hayvan/DSS, faturalar dahil, otopark, bahçe, şömine, video tur, iletişime geçilenleri hariç tut. Konum: km cinsinden yarıçap **veya dakika cinsinden işe gidiş süresi**. Sıralama: Distance, Fiyat ↑, Fiyat ↓, New. **Filtre modalı geçici state + Uygula kullanıyor** (`tempFilters` → `applyTempFilters`) ve `resetFilters()`. "Create Email Alert". "N properties found".

### 3.7 Zoopla (zoopla.co.uk)

- `curl` 403 aldı (Cloudflare). WebFetch script'siz sayfa metni döndürdü. Playwright Chromium harita sayfasını yükledi; Firefox 403 aldı ("Just a moment...").

1. **Vurgular (sayfa metninden):** "Property of the week", "Highlight", "Premium", "Just added", "Reduced", "Chain free", "New home"/"New build", "Available Now", "Pets allowed".
2. **Harita:** **Google Maps** (çalışma anında `google.maps` 3.66.7, "Map data ©2026 Google"). `/for-sale/map/property/london/` harita görünümünde "Draw", "Layers" ve "List view" var. İşaretçi stili *doğrulanmadı* (haritayı çerez penceresi kapattı).
3. **Fiyat filtresi:** kira "£2,600 pcm (£600 pw)" şeklinde, iki birimle birden gösteriliyor. Seçenek değerleri *doğrulanmadı* (yalnızca "Any price" görüldü).
4. **Cihazlar (Playwright, emüle, yalnızca Chromium):** masaüstü, telefon ve tablette "List view" geçişli harita. Telefonda filtreler "Filters" butonuna iniyor. Çerez penceresi her ekran görüntüsünün çoğunu kapattı (kapatılmadı). Firefox → engellendi (403). Engelden sonra WebKit denenmedi.
5. **Filtreler/sıralama:** yarıçap ("This area only", +0.25 … 40 mil), fiyat, yatak odası, mülk tipi. Sıralama: Recommended, Most recent, Highest price, Lowest price, Most reduced. "Save" / "Create alert".

---

## 4. Karşılaştırma tablosu

| Site        | Harita teknolojisi (kanıt)                                      | İşaretçi stili                                                              | Fiyat filtresi                                                                                | Filtre türleri (ana)                                                                                                      | Mobil                                                                        | Liste↔harita senkronu                                              |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| OnTheMarket | Google Maps + @vis.gl/react-google-maps (paket, çalışma anı) | Fiyatsız düz gri pinler (ekran görüntüsü)                                | Hazır adımlar £10k→£25k→£50k→£100k, histogram %; kira pcm                            | Yarıçap, fiyat, yatak odası, tip, under offer dahil durum, yenilik, tapu, çok sayıda işaret; alan çizme             | Tam ekran harita + "List" (emüle)                                           | Doğrulanmadı                                                      |
| Zillow      | Google Maps JS v3.65 (script etiketi, çalışma anı)           | Doğrulanmadı (bot kontrolü)                                                 | Fiyat ($1M'ye kadar $50k adımlar, $18M'ye kadar)**veya** aylık ödeme ($200 adımlar) | 111 tanım: fiyat, yatak N+/tam, banyo, tip, durum, m², yıl, HOA, okul, işe gidiş…                                    | Engellendi (403 / Press & Hold)                                              | Sorgu state'inde harita sınırları; gerisi doğrulanmadı         |
| Rightmove   | Google Maps + @vis.gl/react-google-maps, mapId (paket)           | **Fiyat pinleri + sayılı kümeler**, visited/selected/hover durumları | Satılık toplam; kirada varsayılan pcm                                                      | Yarıçap, fiyat, yatak odası, tip, tapu, must-have/don't-show, eşya, banyo, taşınma tarihi                            | Tam ekran harita + "List" (emüle)                                           | **Hover + selected + visited** durumları; "Search this area" |
| Airbnb      | Google Maps JS (config v3.36, çalışma anı 3.63)              | Yuvarlak fiyat hapları (ekran görüntüsü)                                  | **Kaydırıcı + histogram**, N gece toplamı, TRY                                      | Oda tipi, yatak/yatak odası/banyo, olanaklar, misafir favorisi, anında rezervasyon, mülk tipi…                         | Telefon: harita + liste paneli; tablet: liste + "Haritayı göster" (emüle) | Sınır parametreleri +`search_by_map`                            |
| Sahibinden  | Doğrulanmadı (403)                                             | Doğrulanmadı                                                                 | Doğrulanmadı                                                                                | Doğrulanmadı                                                                                                             | Doğrulanmadı                                                               | Uygulama: haritada bölge seçme                                    |
| OpenRent    | **Leaflet 1.5.1 + markercluster**, MapTiler karoları      | divIcon + kümeler                                                             | **pcm / pw geçişi**, hazır + özel değer, geçersiz seçenekler devre dışı       | Fiyat, yatak odası, banyo, tip, eşya, tarih, kira süresi, evcil hayvan, faturalar… yarıçap**veya işe gidiş** | Telefon: harita "Map View" butonunun arkasında (emüle)                     | **Kart hover → işaretçi vurgusu**                          |
| Zoopla      | Google Maps (çalışma anı 3.66.7)                             | Doğrulanmadı                                                                 | Kira "pcm (pw)"                                                                               | Yarıçap, fiyat, yatak odası, tip; "Most reduced" dahil sıralama                                                        | Harita + "List view" geçişi (emüle)                                       | Doğrulanmadı                                                      |

---

## 5. Kopyalamaya değer kalıplar ve kaçınılacaklar

**Kopyalanacaklar**

- **Fiyat balonu işaretçiler** (Rightmove); ayrı **hover**, **selected** ve **visited** stilleri ve hover'da z-index artışı.
- **Kart hover → işaretçi vurgusu** (OpenRent, Rightmove) ve **işaretçi tıklama → kart vurgusu + görünüme kaydırma** (görev gereksinimi).
- **Geçersiz seçenekleri devre dışı bırakan min/max hazır listeler** ve özel değer (OpenRent, Zillow). Kısa etiketler: "£X+", "Up to £Y", "£X–£Y" (Zillow biçimi).
- **Moda duyarlı fiyat:** satılık ve kiralık için farklı adımlar; birim görünür ("pcm" / "aylık").
- **Yatak odası "Hepsi / 1+ / 2+ / 3+ / 4+ / 5+"** (Zillow).
- **Mobilde geçici state + Uygula butonlu filtre modalı** ve Sıfırla (OpenRent). Sonuç sayısı ("N ilan bulundu").
- Her kaydırmada otomatik yeniden arama yerine **"Bu alanda ara" butonu** (Rightmove). Bizim için isteğe bağlı.
- **Kart başına bir yenilik/fiyat değişikliği rozeti + bir durum etiketi**; rozet yığını değil.
- İşaretçilerin öne çıkması için sade bir altlık harita (CARTO'yu düşünme nedeni).

**Kaçınılacaklar**

- Harita atfını gizlemek (OpenRent mobil). OSM/CARTO koşullarını ihlal eder.
- POC'de anlamı olmayan çok sayıda rozet veya ücretli öne çıkarma etiketi ("Showcase", "Spotlight").
- POC için anahtar veya faturalandırma isteyen özel harita SDK'ları (Google, Mapbox).
- 100'den fazla seçenekli filtre listeleri (Zillow): kapsam dışı.
- Toplu karo indirmek veya karo URL'sini koda gömmek.

---

## 6. POC için önerilen filtre seti ve UX kararları

**Veri modeli** (`docs/architecture.md`'den): `id, image, price, address, city, type, bedrooms, status, lat, lng` (+ "Yeni" rozeti için isteğe bağlı `listedAt` ve "İndirimli" için `previousPrice`).

| Filtre       | Kontrol                                                                                       | Davranış                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Konum        | Metin girişi (şehir/ilçe/adres içerir, büyük/küçük harf duyarsız)                   | Anında, debounce'lu. Harita alanı araması isteğe bağlı (sorulara bakın)                                  |
| İlan durumu | Segmentli kontrol: Satılık / Kiralık (+ mentör isterse Under offer / Sold onay kutuları) | Fiyat birimini ve hazır adımları değiştirir                                                                |
| Fiyat        | Hazır değerli Min + Max seçimleri, "Min yok"/"Max yok"                                     | Min > max yapan seçenekler devre dışı. Satılık ve kiralık (aylık) için ayrı adımlar. Tek para birimi |
| Mülk tipi   | Çoklu seçim çipleri (Daire, Müstakil, Villa, …)                                          | Boş = hepsi                                                                                                    |
| Yatak odası | Tekli seçim: Hepsi, Stüdyo, 1+, 2+, 3+, 4+, 5+                                              | "N+" =`bedrooms >= N`                                                                                         |
| Sıralama    | Seçim: En yeni, Fiyat ↑, Fiyat ↓                                                           | Filtrelemeden sonra uygulanır                                                                                  |

**UX kararları**

- **State:** `filters` (useState), `selectedId`, `hoveredId` (useState). `filteredProperties = useMemo(() => applyFilters(properties, filters), [properties, filters])`. Global store yok.
- **Masaüstü/tablet:** üstte yatay filtre çubuğu, solda liste, sağda harita. Filtreler anında uygulanır.
- **Mobil:** geçici state + "N sonucu göster" + "Sıfırla" butonlu tam ekran filtre modalı. Yüzen Liste/Harita geçiş butonu. Harita görünümünde seçili işaretçi alttan bir kart açar.
- Çubuğun altında, tek tek kaldırılabilen **aktif filtre çipleri** ve "Tümünü temizle".
- **Boş durum:** "Filtrelerinize uyan ilan yok" + "Filtreleri temizle" butonu. Harita görünür kalır.
- **Sonuç sayısı** her zaman görünür.
- **Senkron:** kart hover → işaretçi hover stili; kart tıklama → işaretçi seçili + `map.flyTo`/`panTo`; işaretçi tıklama → kart seçili + `scrollIntoView({block:'nearest'})`. Seçili ve hover farklı stiller kullanır. Seçili ilan filtrelenip çıkarsa seçim temizlenir.
- **İşaretçiler:** `L.divIcon` fiyat balonları (kısa biçim: "₺4,5M" / "£475k"). Kümeleme yalnızca veri seti büyükse.
- **Harita sınırları:** filtreler değişince sınırları `filteredProperties`'e sığdır (her hover'da değil).
- **Erişilebilirlik:** kartlar odak stilli buton/bağlantı; işaretçilerde fiyat ve adres içeren `title`/`aria-label`.

---

## 7. Mentöre sorular

Teknik olmayan bir karar verici için yazıldı. Her soruda neden önemli olduğu ve önerimiz var; kısa bir cevap yeterli.

1. **Demo hangi pazara benzemeli: seçilen bir ülkenin pazarı mı (₺, $ veya £), yoksa örnek sitelerin çoğu gibi İngiltere (£) mi?** *Neden:* örnek ilanları, para birimini ve fiyatların nasıl gösterileceğini belirler.
2. **Ekranlar hangi dilde olmalı: sadece İngilizce mi, yoksa kullanıcı dil seçebilmeli mi?** *Neden:* tek dil demoyu basit tutar; iki dil metinlerde ve biçimlerde ek iş demek. *Önerimiz:* tek dil.
3. **Kullanıcı konumu nasıl seçmeli: şehir/ilçe yazarak mı, haritayı kaydırarak mı ("bu alanda ara"), yoksa ikisiyle de mi?** *Neden:* yazarak arama hızlı yapılır; harita alanıyla arama daha çok iş ama büyük portallardaki gibi hissettirir. *Önerimiz:* önce yazarak arama, zaman kalırsa harita alanıyla arama.
4. **"İlan durumu" filtresi bizim için ne demek?** Görev metninde "listing status" ile filtreleme isteniyor. İncelediğimiz sitelerde bu ifade iki farklı şey için kullanılıyor:
   - **İşlem türü: satılık mı, kiralık mı?** Fiyatın anlamını değiştirir. Satılıkta toplam fiyat gösterilir (ör. 4.500.000 ₺), kiralıkta aylık kira (ör. 25.000 ₺/ay). Rightmove, Zoopla ve OnTheMarket'te bunlar ayrı aramalar ve fiyat seçenekleri de farklı.
   - **Müsaitlik: ilan hâlâ alınabilir mi?** "Müsait", "opsiyonlu" (bir teklif kabul edildi ama işlem bitmedi) ve "satıldı / kiralandı". Sitelerde bu genelde kartın üzerinde küçük bir etiket olarak görünüyor (Rightmove: "Under Offer", "Sold STC", "Let Agreed"), bazen de "opsiyonlu ve satılanları da göster" gibi bir onay kutusu olarak.

   *Neden:* hangisini seçtiğimiz filtre panelini, fiyat filtresini ve örnek veriyi değiştirir. *Önerimiz:* ana filtre satılık / kiralık olsun; müsaitlik kartta etiket olarak görünsün, isterseniz "satılanları gizle" seçeneği de ekleyelim.
5. **Demo ne kadar büyük görünmeli: birkaç düzine ilan mı, yüzlerce mi?** *Neden:* yüzlerce ilanda haritadaki işaretçilerin gruplanması gerekir, bu da ek iş. *Önerimiz:* 30–50 örnek ilan.
6. **Telefon, bilgisayara göre ne kadar önemli?** *Neden:* incelediğimiz siteler telefonda haritayı ya bir butonun arkasına saklıyor ya da önce haritayı gösteriyor. *Önerimiz:* önce bilgisayar; telefonda basit bir liste/harita geçişi.

*Aksini tercih etmezseniz teknik seçimleri kendimiz yapacağız:* React 19 + Vite + TypeScript + Tailwind, OpenStreetMap karoları ve filtre mantığı için testler.

---

## 8. Sınırlamalar (doğrulanamayanlar)

- **Cihaz ve tarayıcı kontrolleri emüle edildi.** Telefon/tablet sonuçları headless Chromium'da Playwright viewport emülasyonundan, tarayıcı sonuçları masaüstü boyutunda headless Firefox ve WebKit'ten geliyor. Gerçek telefon, tablet, iOS Safari veya Edge test edilmedi. Telefon/tablet yalnızca Chromium'da kontrol edildi.
- Her site bir kez kontrol edildi (7 Eki 2026, UK/TR yerel ayarı). Airbnb ve Zoopla ekran görüntülerini çerez veya bildirim pencereleri kısmen kapatıyor.
- **Sahibinden:** tamamen engellendi (curl, WebFetch ve Playwright Chromium için Cloudflare 403, başlık "Bir dakika lütfen..."). Yalnızca App Store açıklaması okundu; telefon, tablet ve diğer tarayıcılar denenmedi.
- **Zoopla:** curl ve Playwright Firefox için engellendi (403); WebKit denenmedi. Harita teknolojisi Chromium'da doğrulandı; işaretçi stili doğrulanmadı.
- **Zillow:** Playwright Chromium'da bot kontrolü ("Press & Hold"), iPhone UA curl için 403. İşaretçi stili, telefon, tablet ve diğer tarayıcılar doğrulanmadı.
- **İşaretçi şekilleri:** Airbnb (fiyat hapları) ve OnTheMarket (düz pinler) koddan değil, yalnızca ekran görüntüsüyle doğrulandı. Zillow ve Zoopla doğrulanmadı.
- **Rightmove** hazır fiyat değerlerinin tam listesi doğrulanmadı.
- Airbnb fiyat aralığı (₺2.500–₺63.000) ve histogram, 2026-10-07'de varsayılan tarihlerle (5 gece) yapılan tek bir İstanbul aramasını yansıtıyor. Aramaya göre değişir.
- Fiyatlandırma ve koşullar (Google, Mapbox, CARTO) 2026-10-07'de okundu ve değişebilir. Mapbox token gerekliliği lisans metninden çıkarıldı (aktif Mapbox hesabı gerekir); kurulum sayfası bunu belirtmiyordu.
- Siteler sık değişiyor ve A/B testi yapıyor (Rightmove `mvtInfo` gösteriyor). Bulgular anlık bir görüntü.
- WebFetch yanıtları küçük bir modelin özetleri; bu yüzden Zoopla ayrıntılarının güvenilirliği curl tabanlı bulgulardan düşük.

---

## 9. Kaynaklar (erişim: 2026-10-07)

**Harita kütüphaneleri ve karolar**

- https://react-leaflet.js.org/docs/start-installation/
- https://leafletjs.com/
- https://github.com/Leaflet/Leaflet (sürümler GitHub API ile)
- https://www.openstreetmap.org/ (kendi sayfası Leaflet ve MapLibre paketlerini yüklüyor)
- https://operations.osmfoundation.org/policies/tiles/
- https://wiki.openstreetmap.org/wiki/Blocked_tiles
- https://carto.com/
- https://carto.com/basemaps/apikey/
- https://carto.com/legal/basemap-terms/
- https://docs.carto.com/faqs/carto-basemaps
- https://maplibre.org/
- https://www.mapbox.com/pricing
- https://docs.mapbox.com/mapbox-gl-js/guides/install/
- https://unpkg.com/mapbox-gl@3.32.0/LICENSE.txt
- https://unpkg.com/react-leaflet@5.0.0/LICENSE.md
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://registry.npmjs.org/ (react-leaflet, leaflet, @types/leaflet, react-leaflet-cluster, leaflet.markercluster, maplibre-gl, react-map-gl, mapbox-gl, @vis.gl/react-google-maps, supercluster)

**Örnek siteler**

- https://www.onthemarket.com/for-sale/property/london/ (+ `?view=map-only`, /assets/0.1.3303/ altındaki JS chunk'ları)
- https://www.zillow.com/homes/for_sale/ ve https://www.zillow.com/austin-tx/
- https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=REGION%5E87490 ve …/map.html (media.rightmove.co.uk altındaki JS)
- https://www.airbnb.com.tr/s/Istanbul/homes
- https://www.sahibinden.com/ ve https://www.sahibinden.com/satilik-daire (403) ve https://apps.apple.com/us/app/-/id530478406
- Playwright çalıştırmaları (7 Eki 2026) şu sayfaları kullandı: Rightmove …/map.html, Zillow /austin-tx/, OpenRent /properties-to-rent/london, Airbnb /s/Istanbul/homes, OnTheMarket …/london/?view=map-only, Zoopla /for-sale/map/property/london/, Sahibinden /satilik-daire
- https://www.openrent.co.uk/properties-to-rent/london (staticcdn.openrent.co.uk altındaki JS)
- https://www.zoopla.co.uk/for-sale/property/london/, …/to-rent/property/london/, …/for-sale/map/property/london/
- https://dribbble.com/search/real-estate (notlarda listeli; incelenmedi)
