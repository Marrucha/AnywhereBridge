# anywhereBridge ✈️

Wieloosobowa gra w brydża (4 graczy) działająca w 100% offline w trybie samolotowym, oparta na standardzie **offline-airplane-multiplayer**, z automatycznym naliczaniem punktacji wg reguł **Brydża Sportowego (Duplicate Bridge)** oraz trwałym zapisem wyników do **Local Storage**.

---

## 🌟 Główne Funkcjonalności

1. **Topologia Pokładowa (Zero-Install):**
   - Gospodarz (Host) uruchamia grę i włącza Hotspot Wi-Fi w telefonie/laptopie.
   - Współgracze (iOS / Android) łączą się z Wi-Fi i skanują kod QR z ekranu gospodarza.
   - Gra uruchamia się bezpośrednio w Safari / Chrome bez pobierania czegokolwiek ze sklepu z aplikacjami.
   - Domyślny pokój pokładowy: **`air-737`**.

2. **Pełna Rozgrywka Brydżowa:**
   - **4 pozycje przy stole:** Północ (N), Południe (S), Wschód (E), Zachód (W).
   - **Rotacja rozdań i założeń:** 16-rozdaniowy oficjalny cykl brydża porównawczego (dealer + partia: przed partią, obie, po partii).
   - **Licytacja (Bidding Box):** Odzywki 1♣ – 7BA, Pas, Kontra (X), Rekontra (XX), walidacja poprawności wysokości i miana.
   - **Wykładanie Dziadka (Dummy):** Po pierwszym wiście karty Dziadka stają się widoczne dla wszystkich przy stole, a zagrania kart Dziadka wykonuje Rozgrywający (Declarer).
   - **Obsługa lew:** Obowiązek dorzucania do koloru, starszeństwo kart, atuty, automatyczne wyłanianie zwycięzcy lewy.

3. **Zapis Brydża Sportowego (Duplicate Bridge Scoring):**
   - Punkty za lewy w kontraktach młodszych, starszych i bez atu (z uwzględnieniem kontry i rekontry).
   - Premia za partię (300 / 500 pkt) lub częściówkę (50 pkt).
   - Premie za szlemika (500 / 750 pkt) i szlema (1000 / 1500 pkt).
   - Premie za ugrany kontrakt z kontrą/rekontrą.
   - Nadróbki (overtricks) i dokładne kary za wpadki (undertricks) przed/po partii z kontrą i rekontrą.

4. **Trwały Zapis w Pamięci Lokalnej (Local Storage):**
   - Każde zakończone rozdanie jest automatycznie utrwalane w `localStorage` każdego podłączonego urządzenia.
   - Podgląd protokołu wyników z sumami punktów par N-S i E-W.
   - Auto-resume: powrót do zajętego miejsca przy przypadkowym odświeżeniu strony.

---

## 🚀 Jak uruchomić

### 1. Uruchomienie aplikacji i serwera:
```bash
# Zbuduj frontend i uruchom serwer pokładowy
npm start
```
Serwer nasłuchuje na porcie `8080` (np. `http://localhost:8080?room=air-737` lub `http://192.168.43.1:8080?room=air-737`).

### 2. Rozwój / Dev mode:
```bash
# Terminal 1 - serwer WebSocket
npm run server

# Terminal 2 - Vite hot-reload
npm run dev
```

### 3. Aplikacja Android (APK) dla Hosta w Samolocie:
1. Przejdź do zakładki **[Actions](https://github.com/Marrucha/AnywhereBridge/actions)** w repozytorium GitHub.
2. Wybierz ostatni workflow **Build Android APK** i pobierz artefakt **`AnywhereBridge-Debug-APK`**.
3. Zainstaluj plik `.apk` na telefonie gospodarza (Android).
4. Telefon gospodarza po uruchomieniu aplikacji sam stawia w tle serwer NanoHTTPD/WebSocket na porcie `8080` i staje się w 100% autonomicznym serwerem pokładowym (nie potrzebujesz komputera w samolocie!).

---

## ✈️ Instrukcja gry na pokładzie samolotu

1. **Gospodarz (Telefon z aplikacją Android APK lub laptopem):**
   - Włącz w telefonie **Hotspot osobisty** (dane komórkowe wyłączone, tryb samolotowy).
   - Otwórz zainstalowaną aplikację `anywhereBridge`.
   - Kliknij ikonę **„Połącz” (QR)** w prawym górnym rogu.
2. **Trzej współgracze (iPhone lub Android):**
   - Łączą się z siecią Wi-Fi hotspotu telefonu gospodarza.
   - Skanują kod QR aparatem swojego telefonu (otwiera się Safari lub Chrome).
   - Każdy wybiera jedno z 4 wolnych miejsc przy stole (N, E, S, W).
3. **Gdy 4 miejsca są zajęte:**
   - Gospodarz klika **„Rozpocznij Rozdanie #1”**.

