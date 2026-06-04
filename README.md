<div align="center">
  <img src="assets/icon/icon_rounded.png" alt="SplitSnap Logo" width="240" height="240">
  <h1>
    SplitSnap<br>
    <sub>Snap receipts. Split bills. Settle up effortlessly.</sub>
  </h1>
  <br>
  <a href="https://apple.co/3PWAfUo">
    <img src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1780185600" alt="Download on the App Store" width="160">
  </a>
</div>

<br>
<p align="center">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Tamagui-151515?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" />
</p>
<br>

## Project Tracking

- **Final Report:** [📄 SplitSnap_Final_Raporu.pdf](docs/school/SplitSnap_Final_Raporu.pdf)
- **Primary document:** [`ROADMAP.md`](ROADMAP.md) — weekly progress, notes, embedded screenshots, and video links.
- **Screenshots:** PNGs are organized by week under [`docs/roadmap-screenshots/`](docs/roadmap-screenshots/) (useful for quick browsing).
- **Weekly Progress Videos:** [YouTube Playlist (all weeks)](https://youtube.com/playlist?list=PLfh_d_SOW477Ie0rM6Yj5QWix_al3jvDc&si=DfWwp8XzHfQsel_b)
  - [Week 1](https://youtu.be/uZ3RfGsreec?si=huxHxwlchSmuWuN4) • [Week 2](https://youtu.be/ErOGMI0s7SE) • [Week 3](https://youtu.be/WzUGQyE3S0g) • [Week 4](https://youtu.be/bfmGb2MThas) • [Week 5](https://youtu.be/tjnbJSpax2M)  
  - [Week 6](https://youtu.be/FsKxH_ItLFo) • [Week 7](https://youtu.be/hHDUEYARdsk) • [Week 8](https://youtu.be/fyO_hSsueec) • [Week 9](https://youtu.be/fsI8G6Z_4Z8) • [Week 10](https://youtu.be/Pwte_m7p3B4)


## Key Features

<div>
  <img src="docs/roadmap-screenshots/apple/mockup/1.png" width="220" align="right" style="margin-left: 20px;">
  <br><br><br>
  <h3>🏘 Groups & Shared Expenses</h3>
  <p>Create groups with your friends, roommates, or travel buddies. Track all shared expenses instantly from a single screen. Say goodbye to complicated math!</p>
</div>
<br clear="both"/>
<br>

<div>
  <img src="docs/roadmap-screenshots/apple/mockup/2.png" width="220" align="left" style="margin-right: 20px;">
  <br><br><br>
  <h3>📸 AI-Powered Receipt Scanning</h3>
  <p>Snap a photo of your receipt or pick one from your gallery. Thanks to AI integration, the expense amount, date, and merchant name are filled in automatically.</p>
</div>
<br clear="both"/>
<br>

<div>
  <img src="docs/roadmap-screenshots/apple/mockup/3.png" width="220" align="right" style="margin-left: 20px;">
  <br><br><br>
  <h3>💸 Fair & Flexible Splitting</h3>
  <p>Split expenses equally among group members or enter exact amounts manually. Our interface calculates the remaining balance in real-time, leaving zero room for error!</p>
</div>
<br clear="both"/>
<br>

<div>
  <img src="docs/roadmap-screenshots/apple/mockup/4.png" width="220" align="left" style="margin-right: 20px;">
  <br><br><br>
  <h3>📊 Detailed Settlement Summary</h3>
  <p>"Who owes whom, and how much?" Get the answer on a single screen. Our algorithm minimizes the debt network, ensuring you settle up with the fewest possible transactions.</p>
</div>
<br clear="both"/>
<br>

<div>
  <img src="docs/roadmap-screenshots/apple/mockup/5.png" width="220" align="right" style="margin-left: 20px;">
  <br><br><br>
  <h3>🌙 Dark Mode</h3>
  <p>A flawless dark mode experience that is easy on the eyes and seamlessly synchronizes with your system theme.</p>
</div>
<br clear="both"/>

## Requirements

- **Node.js** 20.19+ (Expo SDK 56)
- **macOS + Xcode** for iOS Simulator
- **Supabase** project (URL + publishable/anon key)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and fill in:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_KEY`

   Never commit `.env`.

3. **Supabase backend & AI Functions**

   To set up the database schema and deploy the AI receipt scanning edge functions, use the [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase db push
   supabase functions deploy
   ```

   *Note: For the receipt parsing feature to work, you must set your OpenAI API key as a Supabase secret:*
   ```bash
   supabase secrets set OPENAI_API_KEY=your_api_key_here
   ```

   Migrations live under [`supabase/migrations/`](supabase/migrations/). See [`supabase/README.md`](supabase/README.md) for archive/`pg_cron` notes and RPC summary. Schema reference: [`docs/DATABASE.md`](docs/DATABASE.md).

4. **Run on iOS (development build)**

   This project uses **native modules** (e.g. MMKV). Use a **development build**, not Expo Go:

   ```bash
   npm run ios
   ```

   Or: `npx expo run:ios`

   First run generates native projects via prebuild (if `ios/` is ignored in git, this is expected on each fresh clone). The same flow works on a **physical iPhone** (USB or network) with a dev client — not Expo Go.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase + Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

## Contact

**Developer:** Bora Kocabıyık  
**Email:** borakocabiyik@hotmail.com  
**Website:** [splitsnap.borak.dev](https://splitsnap.borak.dev)  

If you have any questions, feedback, or need support, feel free to reach out via email or open an `Issue` in this repository.

## License

This project is licensed under the [MIT License](LICENSE).
