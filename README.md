# Wrench

Wrench is the maintenance app for the winery and bottling plant in Suisun City. It keeps the equipment list, work orders, and QR labels on a phone or a shop computer. It is meant to feel familiar if you have used Limble: lists, cards, color chips for status and priority, and a big Scan button.

This first version stores the book on the phone. You can load your Excel file and download an updated one. It does not yet talk to OneDrive by itself, and it does not yet create PM work orders or subtract parts from stock. Those come later. The columns and ID numbers are already the ones a database, or Ignition, can share later.

Units are US customary only: °F, psi, gallons, feet, pounds, and horsepower. Dates are month/day/year. Money is US dollars.

## Open it

After the site is published, the address is:

https://leroycordelia.github.io/Wrench-cmms/

On a phone, open that link in Safari or Chrome, then use **Add to Home Screen** (Apple) or **Install app** (Android). It then opens full screen, like any other app. The first open needs a signal. After that, the screens and the copy of the data on that phone keep working in the cellar with no signal.

The first time you open it, you are looking at example equipment (the filler, capper, labeler, and compressor) and example jobs. That sample is marked Example. It is there so the app is useful before your real file is loaded.

## Load your Excel file

1. Open **More**, then **Settings**. Or on a computer, **Settings** in the left menu.
2. Tap **Load an Excel file** and pick `CMMS_Data_Template.xlsx` (or the latest copy you saved).
3. The phone replaces its copy with that workbook. Sheet names and column headers have to stay as they are. Do not rename `asset_id`, `wo_id`, and the rest.

You can download the original template from that same Settings screen if you need a clean file with the instructions sheet.

IDs already used on that phone stay retired even if the file you load does not contain them. Wrench will not hand out `AST-0001` again.

The asset list can be a tree (tap the arrow to open a line and see the machines on it) or a flat list. A work order can have a checklist: check a box, pick Yes or No, or type a number. Those answers stay on the phone and go out with the Excel file. PM schedules are read-only here, including their steps.

## Work orders

Open **Work**, or scan a label.

- **Start work**, **Waiting on parts**, **Complete job**, and **Cancel job** move the status.
- Write what you did before you complete a job. Add labor hours, downtime minutes, and any parts you used.
- A safety job, or a priority 1 emergency, stays at the top with a red banner.
- **New work order** assigns the next number (`WO-000006`, then `WO-000007`, and so on). Numbers are never reused, even if a job is canceled.

## Print QR labels

1. Open **QR labels**.
2. Choose **Assets** or **Work orders**.
3. Choose **Avery 5163** (10 larger labels, better for a machine) or **Avery 5160** (30 smaller labels).
4. Uncheck anything you do not want on this sheet.
5. Tap **Print sheet**. In the print dialog, pick your printer or **Save as PDF**. Use letter paper. Turn off headers and footers if the browser offers them, so they do not land on the labels.

Before you print tags that will stay on a machine, open **Settings** and set **Web address for QR codes** to the real site address, for example `https://leroycordelia.github.io/Wrench-cmms`. Labels open `…/a/AST-0001` for an asset and `…/w/WO-000001` for a job. Only the site address changes. The `/a/` and `/w/` paths stay.

A phone camera, including a contractor’s, can open that link. Inside Wrench, **Scan QR** uses this phone’s camera. If the camera is blocked, type the ID instead.

## Save the Excel file again

Settings → **Download Excel**. You get a workbook with the same sheets and the same column names, including anything you added on the phone. Copy that file back to the OneDrive folder (`Skippy/Wrench/`) when you want it to be the copy everyone else starts from. Until OneDrive is connected, two phones will not see each other’s saves unless you move the file yourself. Do not have two people download, edit, and overwrite the same file on the same day.

## Put the app on the internet (one-time)

Someone with access to the GitHub repository does this once:

1. Open the repository on GitHub: `LeroyCordelia/Wrench-cmms`.
2. Click **Settings**.
3. Click **Pages** in the left menu.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After that, every update that lands on the `main` branch publishes the site. The first run can take a couple of minutes. The address is shown on the green check in the **Actions** tab, and it should be:

https://leroycordelia.github.io/Wrench-cmms/

The repository has to be allowed to use GitHub Pages. A private repository may need GitHub’s paid Pages option. A public repository can use the free one.

Then, on your phone, set the QR web address in Settings to that same link and reprint any tags that still say `cmms.local`.

## For the person who maintains the code

The app is a Vite + React + TypeScript progressive web app. `npm install`, then `npm run dev`. `npm test` checks IDs, dates, QR parsing, and the Excel round trip. `npm run lint` and `npm run build` are what the Pages workflow runs.

Screens talk only to `CmmsRepository` in `src/data/repository.ts`. The phone copy is IndexedDB (`src/data/indexeddb.ts`). Excel in and out is `src/data/excel.ts`. A later Microsoft Graph or Postgres adapter should implement the same repository and leave the pages alone. Column names match the workbook. QR paths stay `/a/<asset_id>` and `/w/<wo_id>`.

The production build is served from `/Wrench-cmms/` because this is a project site, not a root site. That base is set in `vite.config.ts`. Deep links work on GitHub Pages because the build also ships `404.html` as a copy of the app. Wrapping this same build with Capacitor later does not require a rewrite.
