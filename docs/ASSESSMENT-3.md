# Assessment 3 run guide

## 1. Start the app

Docker (database seeded with starter content and simulated usage data):

```bash
docker compose down -v
docker compose up --build
```

Or locally:

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Check http://localhost:3000/health returns `200 OK`, then open http://localhost:3000/dashboard.

## 2. Run the checks

```bash
npm run test:unit
npm run test:e2e:install      # once
npm run test:e2e              # then: npx playwright show-report
npm run lighthouse            # needs Google Chrome
npm run load:test             # needs JMeter on PATH, or --jmeter "<path to jmeter.bat>"
```

JMeter notes:

- Run it against the Docker container or `npm run build && npm start`, not `npm run dev`, which is much slower.
- Stage ramp-up times are 1, 5, 20, 60 and 120 seconds for 1, 10, 100, 1000 and 10000 users. Change levels with `--stages 1,10,50,100,250` if your machine cannot reach 10000.
- 10000 threads needs a lot of memory and file handles. `JVM_ARGS` defaults to `-Xms1g -Xmx4g`. Errors at the top levels are a valid result to explain (see below).
- Results: `jmeter/results/summary.md` and `jmeter/results/<users>-users/report/index.html`.

## 3. Explaining the results (talking points)

- **Load:** SQLite serialises writes. Each user workflow makes 6 writes (list, word, activity, two generation logs, and a delete). Expect response times to rise and then errors (timeouts, "database is locked", connection refusals) as users grow, with read-only calls (`/health`, `/api/metrics`) staying faster than writes. State the level where the error rate first exceeds a few percent.
- **Scaling options:** move from SQLite to PostgreSQL, add connection pooling, cache `/api/metrics` for a few seconds, and run several app instances behind a load balancer.
- **Lighthouse:** record the score per page, the failed audits, what you changed and the new score. Accessibility features already built in (confirm with your own Lighthouse run): skip link, landmarks, table captions and `scope`, labelled controls, text alternatives for charts, status written as words as well as colour, `aria-live` regions.

## 4. Video checklist (3 to 8 minutes, show face, voice and student ID)

1. Student ID, face and voice at the start.
2. Home page, then `/dashboard`: health (`/health` 200 OK), alerts, key statistics, charts, word list and activity summaries.
3. Click "Add simulated data" and show the numbers change. Show `/reports` with filters and CSV export.
4. Builder use case: create a word list and words, save a Wordle, reload to show persistence.
5. User use case: open and download a generated Word Search, then show the generation count rising on the dashboard.
6. Trigger a failure: delete the only word in an activity, try to download it, show the failed count and the alert.
7. Playwright run (`npm run test:e2e`) and the HTML report.
8. JMeter summary table and one HTML report, with the explanation above.
9. Lighthouse reports and the changes you made.
10. GitHub homepage and commit history.

## 5. Submit

- Zip the project without `node_modules` and `.next` (and without `.env` and `*.db`).
- GitHub repository link.
- Video, 3 to 8 minutes.
- Both files go to Moodle via Turnitin, and each must generate a similarity score.

## 6. Suggested commits

1. Add observability schema and migration (generation status, page visits, simulated flag)
2. Record generation results and add metrics, alerts and report services
3. Add metrics, alerts, reports and simulation API routes
4. Add dashboard and reports pages
5. Track time on page and improve accessibility
6. Add unit tests
7. Add Playwright end-to-end tests
8. Add JMeter plan and runner, Lighthouse runner
9. Update README, Docker files and documentation
