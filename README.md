# Auto Host Rotate Bot

![lobby banner](https://dev.autohostrotate.com/banner)

To install dependencies:

```bash
bun install
```

To run:

> Make sure you have done everything in [Configuring](#configuring) first!

```bash
bun run src/index.ts
```

## Configuring

1. First copy the [`.env.example`](.env.example) to `.env` and fill in the empty variables.
2. You can create a supabase project at [database.new](https://database.new).
3. Supabase variables are [[here](https://supabase.com/dashboard/project/<project_slug>/settings/api)](https://supabase.com/dashboard/project/<project_slug>/settings/api).
4. `DATABASE_URL` is not needed for running the bot, it is only used for fetching the types from the database.
5. You can get your osu variables at [osu.ppy.sh](https://osu.ppy.sh/home/account/edit#legacy-api)

---

This project was created using `bun init` in bun v1.1.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
