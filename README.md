# Lost and Found App

Phase 3 adds the first real product workflows on top of the Phase 2 authentication foundation.

## Included in this phase
- Lost item posting flow
- Found item posting flow
- MongoDB-backed browse page
- Item details page
- Member dashboard summary cards
- My Listings page
- Reusable item card component
- Basic item API endpoints (`GET /api/items`, `GET /api/items/:id`)

## Run locally
1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI` to your Atlas connection string
3. Run `npm install`
4. Start the app with `npm run dev`

## Phase 3 verification checklist
- Login with a member account
- Create a lost item from `/items/new/lost`
- Create a found item from `/items/new/found`
- Visit `/items/mine` and confirm both posts appear
- Visit `/browse` and confirm real MongoDB data appears
- Click an item card and confirm the detail page loads
- Visit `/dashboard` and confirm the summary counts update


## Image uploads

Item photos are stored in `public/uploads/`. The current upload validator accepts JPG, PNG, and WebP files up to 350 KB.
