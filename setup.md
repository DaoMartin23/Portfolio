# Setup

Everything you need to get this portfolio online under your own accounts, in
order. Work through it top to bottom — each section ends with a checkpoint so you
know it worked before moving on.

Rough time: 20–30 minutes, most of it waiting on sign-up emails.

## 0. What this is

A static website. No build step, no dependencies, no `npm install` — just HTML,
CSS, JavaScript and some SVGs. Opening `index.html` in a browser runs the whole
thing.

That makes hosting it very simple, which is why the steps below are short.

---

## 1. Check it runs locally

Unzip the folder somewhere sensible, then open it in a terminal:

```bash
cd path/to/martin-portfolio
open index.html
```

**Checkpoint:** the loader animation plays, your name resolves on screen, and the
page scrolls normally.

The contact form will *not* work yet. That's section 4.

---

## 2. Put it on GitHub

You need a GitHub account and `git`. Check git first:

```bash
git --version
```

If macOS offers to install developer tools, accept — that's git.

### 2.1 Create an empty repo

On github.com, click **New repository**. Name it something like `portfolio`.

**Do not tick "Add a README", "Add .gitignore", or "Choose a licence."** The repo
must be completely empty, otherwise the push in 2.2 will be rejected for having
conflicting history.

### 2.2 Push the code

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DaoMartin23/portfolio.git
git push -u origin main
```

Swap `portfolio` in the remote URL for whatever you named the repo.

**When it asks for a password, your GitHub password will not work.** GitHub wants
a personal access token instead. Get one at:

Settings → Developer settings → Personal access tokens → Tokens (classic) →
Generate new token → tick the **`repo`** scope → generate → copy it.

Paste that token at the password prompt. Save it somewhere; it's shown once.

**Checkpoint:** refresh your repo page on github.com. All the files are there —
`index.html`, `css/`, `js/`, `assets/`, `projects/`.

> If git gives you too much trouble, there's an escape hatch: on the empty repo
> page, click "uploading an existing file" and drag the folder's contents into
> the browser. The project is small enough that this works fine.

---

## 3. Deploy on Vercel

### 3.1 Sign up

Go to vercel.com and **sign up with GitHub**. This lets it see your repos without
any extra setup.

### 3.2 Import the repo

**Add New → Project**, then import the repo you just pushed.

### 3.3 Settings — read this bit carefully

Vercel will try to guess how to build the project. There is nothing to build, so
its guess is wrong. Set:

| Setting | Value |
|---|---|
| Framework Preset | **Other** |
| Build Command | leave empty |
| Output Directory | leave empty |
| Install Command | leave empty |

If you leave a build command in there, the deploy fails.

### 3.4 Deploy

Click Deploy and wait about 20 seconds.

**Checkpoint:** the site is live at something like
`portfolio-xyz.vercel.app`. Open it on your phone too.

From now on, every `git push` to `main` redeploys the site automatically. You
don't have to touch Vercel again.

---

## 4. The contact form

The form currently ships with a placeholder address and does nothing — messages
go nowhere. This section points it at your inbox.

We're using **Formspree**, which handles the email sending so the site doesn't
need a backend.

### 4.1 Create your form

1. Go to formspree.io and sign up **with the email address you want messages
   delivered to**. This is the whole point of the section — whatever address you
   use here is where the messages land.
2. Create a **New Project**, then a **New Form** inside it.
3. Name it "Portfolio contact" and check the target email is right.
4. Copy the form endpoint it gives you. It looks like:
   `https://formspree.io/f/abcdwxyz`

### 4.2 Paste it into the site

Open `index.html` and go to **line 923**. Search for `PLACEHOLDER_FORM_ID` if the
line number has drifted. Replace just the placeholder part:

```html
<!-- before -->
action="https://formspree.io/f/PLACEHOLDER_FORM_ID"

<!-- after -->
action="https://formspree.io/f/abcdwxyz"
```

Then delete the stale comment four lines above it, on **line 919**:

```html
<!-- [PLACEHOLDER: replace PLACEHOLDER_FORM_ID with your Formspree form id] -->
```

### 4.3 Push the change

```bash
git add index.html
git commit -m "Point contact form at Formspree"
git push
```

Vercel redeploys on its own within a minute.

### 4.4 Activate it

Go to your **live Vercel URL** — not the local file — and send yourself a test
message through the form.

**Formspree will email you a confirmation link. The form stays inactive until you
click it.** This catches people out; if your first test message never arrives,
this is why.

**Checkpoint:** click the confirmation link, then submit the form again. The page
shows "Sent. Box box. I'll reply soon." and the message arrives in your inbox.

### Worth knowing

- The free tier covers **50 submissions a month**, which is plenty for a
  portfolio.
- In Formspree's settings you can restrict the form to your own domain, which
  cuts down spam. Optional.

That's the only code change the site needs. Nothing else is hardcoded to an
account.

---

## 5. Optional extras

Neither of these is required for a working site.

**Custom domain.** If you buy one, add it in Vercel under Settings → Domains and
follow its DNS instructions.

**Link previews.** The site has no `og:image` or `og:url` tag, so when you share
the link on LinkedIn or WhatsApp it'll show a bare URL with no picture. Worth
adding if you plan to send it around a lot.

---

## 6. Clean up

Once the site is live and the form works, delete the planning docs so your public
repo contains only the site:

```bash
rm setup.md mobile.md react.md
git add -A
git commit -m "Remove planning docs"
git push
```

For reference before you bin them: `mobile.md` is a mobile layout audit, and
`react.md` is notes on a possible future rewrite in React. Neither affects the
site as it stands.
