# TechStack ICP — how it works, in plain English

No code in this document. It explains what the tool does, why it sometimes refuses to answer, and what to do about it.

---

## The problem

You want a list of accounts that use a particular technology — or, more often, accounts that *don't*. Every technographic vendor will sell you that list. The list looks like this:

> **northwind.example** — uses Segment, Snowflake, Intercom

Three names, presented identically. But those three facts were found in three completely different ways, and they are not equally true.

- **Intercom** was found because a chat widget is loading on their website right now. Anyone can open the page and see it.
- **Segment** was found the same way — a tracking script in the page.
- **Snowflake** was found because somebody at the company posted a job ad mentioning it.

The first two mean the software is running. The third means somebody wants to hire for it, which is not the same thing — it might be a plan, a pilot, or a manager writing a wish list.

The vendor's list flattens all of that into three equal-looking names. Then a rep opens with "I saw you're running Snowflake" and finds out the hard way.

---

## What this tool changes

Every technology on every account carries four things.

**1. Where it was seen.** One of six places:

| Where | What it actually tells you |
|---|---|
| The website's page code | The marketing team installed this |
| The website's response headers | This sits in front of their website |
| Their DNS records | Their domain is set up to route through this |
| A job posting | Somebody wants this skill — intent, not proof |
| Their engineering blog | Engineering wrote about it, possibly years ago |
| A vendor's customer directory | They pay for it — not proof it is deployed |

That column on the right matters. A marketing tool found in the page code proves marketing bought something. It says nothing about the engineering team. Most "modern data stack" targeting is really measuring marketing budgets, and nobody says so.

**2. How strong the evidence is.** Three levels, no maths:

- **Confirmed** — the thing is running. A tag loading, a header present, a DNS record resolving.
- **Likely** — a paid relationship or a job posting that requires it.
- **Hinted** — one sentence, once, somewhere.

**3. How old it is.** Every source goes stale at a different speed. A tag on a website is reliable for about six months; a response header for three; an engineering blog post stays relevant for a year and a half but was never strong evidence to begin with. Evidence drops one level each time that period passes, and eventually stops counting at all.

**4. What we actually know.** This is the part no other tool does.

---

## Four answers, not two

Most tools have two answers: uses it, or doesn't. This one has four, and the difference between the last two is the whole point.

| Answer | Means |
|---|---|
| **Present** | We saw it. |
| **Absent** | We looked somewhere it would definitely have shown up, and it wasn't there. |
| **Not checked** | Nobody looked anywhere that would show it. **More data would fix this.** |
| **Unknowable** | Nothing we can ever look at would show it. **More data would not fix this.** |

The last two look identical in a spreadsheet — both are a blank cell — and they are opposite problems. "Not checked" is a to-do. "Unknowable" is a wall.

---

## Why the tool sometimes refuses

Here are two queries that look identical:

> Show me accounts that **do not use Intercom**.

> Show me accounts that **do not use Snowflake**.

The first has an answer. Intercom is a chat widget: if a company runs it, it is in their website's code. Fetch the page, no widget, they don't run it. Done.

The second has no answer, ever. Snowflake is a database. It runs on servers nobody outside the company can see. It doesn't appear in a page, a header, or a DNS record. You could inspect that company every day for a year and never establish that they *don't* use it.

**Every technographic vendor will run both queries and give you a list either way.** The second list is just "every company we have no Snowflake record for" — which is most of them, including the ones that use it heavily.

This tool strikes that predicate out before running it and tells you what would be needed instead: someone inside the company, a contract, or the customer telling you. That's an honest answer to a question that has no data answer.

To make it clear this is a principle and not a broken feature, two of the four presets are the same question about different categories:

- *Modern data stack, no reverse ETL* — **refuses.** Reverse ETL runs between a warehouse and other tools. Nothing client-side to see.
- *Analytics in place, no chat tool* — **answers.** Chat widgets are always in the page.

---

## Things it flags that others miss

**Migrating.** Two competing tools both confirmed and running at once means a migration is underway. Most systems treat this as a data error and dedupe one away. It's the most useful thing on the page — it is the week to call.

**Vestigial.** A retired tool still loading on the site next to its replacement. The tag is real; the deployment isn't. A rep who opens with the old tool's name has told the buyer they're reading stale data.

**Contradicted.** The site loads one vendor, and the engineering blog says they replaced it last quarter. Both facts are true. Only one is about today, and the tool shows you both rather than picking.

**Implied but invisible.** If a company confirmed a customer data platform, a data warehouse exists somewhere — that's what a CDP sends data *to*. The tool says so, and refuses to guess which warehouse. Guessing is exactly what it exists not to do.

---

## The date control

There's an as-of date at the bottom of the query panel. Everything is evaluated against it, not against today.

One account, Quillon, was last inspected three years ago. Set the date to 2023 and it's a confident match on everything. Set it to today and almost every claim drops to "not checked" — not because anything changed at the company, but because nobody has looked since, and the tool won't pretend three-year-old evidence is current.

That is the same account, the same data, and two honest answers to the same question asked about different moments.

---

## What you get out

- **A permalink.** The whole query is in the URL, so a link rebuilds the exact list someone else saw.
- **A CSV**, with one column per condition holding the four-state answer as a word. `Not checked` stays "not checked" instead of becoming an empty cell — which is the failure this entire tool is about, and it would be embarrassing to reintroduce it in the export.

---

## Two things you can turn on

**Describe the segment in words.** With an API key configured, you can type "companies running a CDP but no chat tool" and get the conditions built for you. The AI does one job: turning your sentence into conditions. It never decides whether a company uses something, and never judges how confident to be — that all comes from the evidence rules. The result lands in the builder for you to check before it runs.

**Inspect a real website.** Type a domain and it fetches one page. This is the clearest demonstration of the whole idea: one fetch can see the page code and the response headers, and that's it. Four of the six sources stay unchecked — so anything only visible there stays "not checked", never "absent".

---

## The companies aren't real

All fourteen are invented and every domain ends in `.example`. They exist to carry one specific trap each — the stale account, the migrating account, the one where a job posting oversells, the one where the honest answer is "nobody has checked". Each trap has a test named after it, so if a future change breaks one, the test that fails tells you which situation stopped working.
