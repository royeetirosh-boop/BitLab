# BitLab — EE student toolkit

Interactive lab for electrical / digital engineering: number bases, BCD +6, Karnaugh maps, Quine–McCluskey, Boolean algebra, logic gates, flip-flops, DC circuits, and calculators.

## Web

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Android & iOS (Capacitor)

The same UI ships as native shells via [Capacitor](https://capacitorjs.com/).

```bash
npm install
npm run mobile:sync          # build web → copy into native projects
npm run mobile:android       # opens Android Studio (Windows/macOS/Linux)
npm run mobile:ios           # opens Xcode (macOS only)
```

- **Android:** install [Android Studio](https://developer.android.com/studio), open the `android/` folder, run on an emulator or device.
- **iOS:** requires a Mac + Xcode. Open `ios/App/App.xcworkspace` (or use `npm run mobile:ios`), then run on Simulator / device.

App ID: `com.bitlab.ee`

## Modules

- **Convert** — decimal, binary, BCD, Gray, hex, octal
- **Lesson** — animated any→any conversions + BCD +6
- **K-map** — מפות קרנו (2–4 var) with don’t cares + minimized SOP/POS
- **McCluskey** — Quine–McCluskey tables (2–5 var) + prime-implicant chart
- **Boolean** — truth tables → canonical & minimized forms
- **Logic Lab** — ANSI gates, wire tool, run propagation
- **Seq** — SR / JK / D / T flip-flops
- **Circuits** — traditional schematic symbols, wire + run
- **Tools** — resistor color code, Ohm/power, series RLC phasors, SI prefixes, formula sheet
