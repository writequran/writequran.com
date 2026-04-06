<img width="514" height="300" alt="image" src="https://github.com/user-attachments/assets/ce866526-71f9-40ca-b2e3-b989acb5c078" />
<img width="514" height="300" alt="image" src="https://github.com/user-attachments/assets/afbf4686-c0e6-4b62-a830-69603dce63c8" />
<img width="514" height="300" alt="image" src="https://github.com/user-attachments/assets/60ffc0e1-e163-4a87-a612-1860d36471a7" />
<img width="514" height="300" alt="image" src="https://github.com/user-attachments/assets/55b1864d-6753-4bc5-92b8-855003c60911" />
<img width="514" height="300" alt="image" src="https://github.com/user-attachments/assets/986fc60c-ef66-40ad-9bbb-ae4a1cd63809" />

# WriteQuran

**Live app: [writequran.com](https://writequran.com)**

WriteQuran is a Quran writing and memorization web app designed to help learners strengthen visual memory of the Mushaf by typing ayah letter by letter.

<p align="center">
  <img src="https://github.com/user-attachments/assets/ce866526-71f9-40ca-b2e3-b989acb5c078" alt="WriteQuran home" width="46%" />
  <img src="https://github.com/user-attachments/assets/afbf4686-c0e6-4b62-a830-69603dce63c8" alt="WriteQuran typing" width="46%" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/60ffc0e1-e163-4a87-a612-1860d36471a7" alt="WriteQuran progress" width="46%" />
  <img src="https://github.com/user-attachments/assets/55b1864d-6753-4bc5-92b8-855003c60911" alt="WriteQuran leaderboard" width="46%" />
</p>
It combines writing practice, mistake review, memorization testing, progress tracking, and a public leaderboard into one focused experience for both Arabic and English users.

## What It Offers

- Letter-by-letter Quran writing practice
- Mistake review with spaced repetition
- Memorization test mode with random ayah selection
- Progress tracking across surahs, ayat, and letters
- Public profiles and leaderboard
- Arabic and English interface support
- Mobile and desktop friendly experience

## Main Sections

- `Start Writing`  
  Practice Quran writing directly from the Mushaf layout.

- `Review Mistakes`  
  Revisit weak spots and repeat the places where errors happened.

- `Memorization Test`  
  Choose a surah range and test retention through random ayat.

- `My Progress`  
  Follow milestones, surah progress, review analytics, and activity.

- `Leaderboard`  
  Compare overall progress through a simple public rating system.

## Project Goal

The aim of WriteQuran is to support Quran learners in building stronger writing accuracy, visual familiarity, and memorization consistency through focused repetition and clean daily practice.

## Getting Started

Run the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

To create a production build locally:

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase (authentication and data)

## Notes

- The interface supports both English and Arabic.
- Some features are available without an account, while account-based features allow synced progress and public profile functionality.
- Quran text in the app is based on the [Tanzil Uthmani text](https://tanzil.net), a widely trusted digital Quran text resource.


## Contributing

Contributions, feedback, and corrections are welcome.

If you notice a bug, translation issue, or usability problem, feel free to open an issue or submit a pull request.

## License

**Code:** Licensed under the [GNU General Public License v3.0](LICENSE). Any modified version that is distributed must also be released under GPL v3.

**Quran text:** The Uthmani text in `src/data/quran-uthmani.json` is sourced from [Tanzil](https://tanzil.net) and is subject to [Tanzil's terms of use](https://tanzil.net/docs/license). Attribution is required and commercial use is not permitted under those terms.
