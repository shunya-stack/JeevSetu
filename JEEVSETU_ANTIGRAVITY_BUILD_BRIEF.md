# JeevSetu

## Antigravity build brief --- Functional hackathon MVP

**Product:** JeevSetu — voice-first animal-health intake, safety-bounded triage support and veterinary referral\
**Build target:** A polished, responsive web MVP that can be
demonstrated end-to-end\
**Primary AI stack:** Gnani AI --- Prisma + Evon + Timbre (only where
the relevant API/model access is confirmed)\
**Primary geography for the demo:** Odisha, India\
**Primary languages:** Odia-first, with Hindi and natural Odia/Hindi
code-mixing\
**Important product boundary:** This is a veterinary intake and
escalation assistant, not an AI veterinarian. It must never
independently prescribe medicines, dosages or treatment.

------------------------------------------------------------------------

# 0. Instructions to Antigravity --- read before coding

You are the lead product designer and full-stack engineer. Build the
application described in this document, not a generic dashboard or a
static landing-page mockup.

## Mandatory working rules

1.  **Inspect the repository first.** Identify existing code, framework,
    scripts and environment variables. Do not overwrite a working
    project without explaining why.
2.  **Plan before implementation.** Produce a short implementation plan,
    route map, component map, data model and risk list. Then implement
    in the phases below.
3.  **Build a real, connected MVP.** Buttons, navigation, forms, audio
    recording, case creation, dashboard filters, case detail and status
    changes must work. Do not leave decorative controls that do nothing.
4.  **Use Gnani as the primary AI provider.** Create a clean provider
    adapter for Prisma, Evon and Timbre. Never invent endpoint URLs, SDK
    package names, request formats or model capabilities. Inspect the
    official Gnani documentation and the credentials available in the
    environment. If a capability is unavailable, show a clear
    integration status and use an explicitly labelled demo adapter.
5.  **Never fake a live AI result.** Demo data and simulated responses
    must be visibly labelled `DEMO MODE`. Never present a static
    transcript as a real Prisma transcription.
6.  **Do not make clinical claims.** The app collects symptoms, detects
    configured red flags and recommends contacting a qualified
    veterinarian. A veterinarian-approved rule set controls urgency. No
    medicine names, dosage, injections or treatment instructions may be
    generated.
7.  **No fabricated real-world services.** Seeded vets, clinics, phone
    numbers, availability and locations must be labelled sample/demo
    data until verified. Never imply a referral has been accepted unless
    a real integration confirms it.
8.  **Design quality is a requirement.** Follow the visual direction
    below. Do not use a generic admin template, purple gradients,
    excessive glassmorphism, random gradients or oversized empty
    dashboard cards.
9.  **Responsive and accessible.** Test desktop, tablet and mobile.
    Support keyboard navigation, visible focus states, screen-reader
    labels, reduced motion and large touch targets.
11. **Verify each phase.** Run typecheck, lint, tests and production
    build. Use the browser to inspect the actual UI at desktop and
    mobile widths. Fix issues rather than merely reporting them.
12. **Keep the MVP small.** Do not add Kubernetes, microservices, Kafka,
    complex agent frameworks, payment systems, farmer social feeds or
    unrelated features.
13. **Do not stop after the homepage.** Continue through the complete
    farmer flow and veterinarian dashboard described below.

## Definition of done

A user must be able to: - Open the homepage and understand the
service. - Start a livestock case. - Record or upload audio, or use a
text fallback. - See the actual transcript returned by the configured
Gnani adapter, or a clear demo-mode result if no API is configured. -
Review extracted structured symptoms. - See a safety-bounded urgency
result and next step. - Submit the case. - Open the veterinary dashboard
and find the case. - Open the case, review the evidence and update its
operational status. - View a nearby-vet directory/map using verified or
explicitly demo-labelled records. - Complete the whole journey without
dead buttons or broken routes.

------------------------------------------------------------------------

# Brand identity: JeevSetu

## Name and positioning

- **Working brand name:** `JeevSetu` (preserve this exact spelling in the UI and repository unless the founder changes it).
- The name is a deliberate brand spelling inspired by the Sanskrit-derived name **JeevSetu / Shreyā (श्रेय / श्रेया)**, commonly associated with auspiciousness, excellence, well-being and the greater good.
- **Do not claim that “JeevSetu” is the standard Sanskrit spelling or a literal Sanskrit word.** Treat the meaning as an intended brand association, not a dictionary translation.
- Suggested brand line: **“Care that reaches every life.”**
- Suggested mission interpretation: **“The pursuit of the greater good for every living being.”** This is brand language, not a literal translation.
- The name should not make the product sound like a veterinary clinic or a livestock-only utility. The platform's long-term identity can encompass animal welfare broadly, while this MVP focuses on livestock health intake and veterinary referral.

## Emotional foundation

The project carries a personal tribute to a stray cat that was attacked by stray dogs. People tried to save the cat, but it died. Do not turn this story into a public marketing anecdote unless the founder explicitly chooses to share it. Do not depict the cat, violence, injury or death in the product interface. Translate the underlying motivation into a respectful product principle: vulnerable animals should not be left without a path to timely care.

The emotional centre is compassion, protection, attachment and timely help—not tragedy, guilt or sentimental manipulation. The farmer embracing the calf is the visual metaphor for the care every animal deserves. The product must still communicate practical utility and veterinary escalation, not just emotion.

## Brand voice

- Indian in identity; contemporary in execution.
- Compassionate but not childish, sentimental or preachy.
- Clear, trustworthy and useful to rural users.
- Avoid exaggerated promises such as “save every animal” or “instant treatment”.

## Colour direction

Use a landscape-inspired tricolour palette:
- **Ivory / warm white:** dominant sky, page canvas and breathing space.
- **Saffron / sunrise orange:** sunlight and restrained highlights.
- **Field green:** grass, crops, hills and primary brand accents.
- **Deep forest green / charcoal:** text, navigation and contrast.

Do not divide the interface into three equal flag-colour bands. Do not make it look like an Independence Day campaign. The existing calm ivory/forest-green UI tokens remain the base; introduce saffron and brighter natural greens mainly through the homepage artwork and carefully limited accents.

## Homepage hero art direction

- Wide panoramic composition suitable for a desktop hero (target 16:9 or wider crop, with responsive art direction for mobile).
- RIGHT third: one young Indian boy and one calf, both appealing stylized 3D animated characters with expressive faces and believable proportions. The boy gently embraces the calf; the calf leans into him. Their affection is the emotional focal point.
- LEFT half: uncluttered, low-detail text-safe space for headline, description and CTA. Keep essential faces away from this text zone.
- Background: Indian rural village, modest huts, farms/fields, trees, distant green mountains and a visible lake/pond nearby. A few subtle rural details are enough; avoid visual clutter.
- Sky and lighting: warm saffron/orange sun near the horizon, soft ivory-white sky, green land. Make the colours blend naturally as a sunrise landscape rather than literal flag stripes.
- Style: polished, high-end 3D animated family-film aesthetic, soft cinematic morning light, tactile materials, detailed environment, warm but restrained colour grading. Do not copy specific copyrighted characters, studio marks or a particular film frame; create original characters.
- No text, logos, UI, watermark, medical symbols or extra foreground characters inside the generated image.
- Keep the left side readable with a subtle ivory overlay/gradient if needed. The hero must remain legible at common desktop and mobile breakpoints.
- The hero is a visual metaphor for care; it must not imply that the app itself provides physical treatment.

------------------------------------------------------------------------

# 1. Product definition

## One-line positioning

**A voice-first livestock emergency intake system that helps rural
cattle rearers explain an animal's symptoms in their own language and
helps veterinary teams receive structured, actionable case
information.**

## The problem

A livestock rearer may not know how to describe symptoms in a formal
form, may be more comfortable speaking than typing, and may not know
which veterinary service to contact. A call centre or veterinary worker
receiving an unstructured account has to ask the same basic questions
repeatedly.

## The solution

The farmer speaks naturally in Odia, Hindi or a mixture. Gnani speech
and language models help convert the conversation into structured case
information. A conservative, veterinarian-approved triage ruleset
highlights configured warning signs and recommends escalation. The
system packages the case for a human veterinary professional.

## Product roles

### Farmer / livestock rearer

-   Wants to report an animal health concern quickly.
-   May have limited typing confidence or connectivity.
-   Needs large controls, clear audio feedback and simple language.
-   Must be told that this service does not replace a veterinarian.

### Veterinary operator

-   Needs a structured case, not a long unformatted transcript.
-   Needs animal details, symptoms, duration, location, urgency flags
    and contact details.
-   Needs to review the original transcript/audio where consent permits.
-   Needs clear status tracking.

### Administrator / demo operator

-   Needs to see incoming cases, status, urgency distribution and
    service directory data.
-   Can manage demo cases and sample veterinary service records.

------------------------------------------------------------------------

# 2. Scope: what to build and what not to build

## Mobile-first MVP strategy

Build the farmer experience as a phone-first web app/PWA-style experience. Do not build a native Android/iOS app for this hackathon MVP.

### Mobile design constraints
- Design baseline: 390 × 844 CSS px. Also verify 360 × 800 and 412 × 915.
- Single-column layouts first; introduce columns only when the viewport supports them.
- Minimum touch target: 44 × 44 CSS px; prefer 48px for primary actions.
- Farmer-facing body text should be at least 16px. Use high contrast and clear labels.
- Avoid hover-only interactions, dense tables, tiny icon buttons and multi-column forms on phones.
- Use short, progressive steps with visible progress. Back navigation must preserve entered data.
- Keep nonessential animal, contact and location fields optional.
- Optimise images, lazy-load below-the-fold media and avoid heavy animation on low-end phones.
- Preserve drafts locally during navigation or temporary network loss. Prevent duplicate submissions.
- Test microphone permission, recording and playback on Android Chrome; desktop testing is insufficient.
- Provide upload and typed-description fallbacks when microphone access fails.
- Keep the UI usable at 200% text zoom and with reduced motion enabled.

### Mobile navigation
- Public site: compact top bar, logo, language selector and one primary CTA; secondary links in a simple menu.
- Farmer flow: minimal header, step indicator, clear Back and Continue actions.
- Operator: desktop sidebar; on narrow screens use compact navigation and stacked case cards instead of wide tables.

### Mobile-first implementation order
1. Establish mobile breakpoints, typography, spacing, navigation and reusable controls.
2. Build the complete farmer journey at 390px using demo data.
3. Make the flow functional before connecting live AI.
4. Add backend persistence and safe retry/draft recovery.
5. Integrate Gnani and test real mobile audio capture.
6. Build the operator console separately.
7. Run mobile QA on real Android hardware or a real-device browser service if available.

## Must-have MVP

-   Responsive public homepage.
-   Farmer language selection.
-   Voice recording using browser microphone permissions.
-   Audio file upload fallback.
-   Text description fallback.
-   Gnani Prisma adapter for speech-to-text.
-   Gnani Evon adapter for structured extraction, if API access is
    available.
-   Gnani Timbre adapter for spoken response, if API access is
    available.
-   Veterinary-approved, deterministic urgency rules.
-   Case review and submission.
-   Case confirmation screen.
-   Veterinary dashboard with case queue, filters and search.
-   Case detail page with transcript, extracted symptoms, warning flags,
    location and status history.
-   Sample veterinary service directory and map, clearly labelled demo
    data until verified.
-   Demo mode that works without API keys.
-   Responsive layout, loading states, empty states, errors and success
    states.
-   README, `.env.example`, tests and setup instructions.

## Explicitly out of scope

-   AI diagnosis or autonomous treatment recommendations.
-   Medication names, dose calculations or injection instructions.
-   Real emergency dispatch unless an actual service integration is
    approved and available.
-   Real government helpline integration.
-   Real toll-free telephony number.
-   Payments, donations or vaccine fund collection.
-   Native Android/iOS app.
-   Production identity verification or sensitive identity-document
    collection.
-   Predictive disease outbreak claims.
-   Claims that the product saves a specific rupee amount without
    evidence.

------------------------------------------------------------------------

# 3. Visual design direction

## Design concept: "Indian compassion, modern animal-care intelligence"

The product should look like a credible, well-funded Indian
agritech/healthtech product. Avoid a stereotypical farm website with
cartoon cows, bright green gradients and clip-art.

### Visual language

-   **Primary:** Deep forest green.
-   **Secondary:** Muted sage.
-   **Canvas:** Warm ivory / off-white.
-   **Accent:** Restrained marigold or amber for attention and urgency.
-   **Critical state:** Accessible red, used only for genuine emergency
    warnings.
-   **Typography:** Use a polished Latin typeface such as `DM Sans` or
    `Manrope`, paired with `Noto Sans Oriya` for Odia. Load a font with
    real Odia glyph coverage and test it in the browser.
-   **Layout:** Mobile-first single-column composition, efficient spacing, strong typographic hierarchy, clear cards, restrained borders and subtle shadows. Design phone layouts first; add columns only at larger breakpoints.
-   **Photography:** Use authentic documentary-style images of Indian
    livestock rearers, cattle and veterinary workers. Avoid fake
    AI-looking stock collages. Use licensed/usable images and provide
    graceful fallbacks.
-   **Icons:** Lucide icons. Use icons consistently; do not mix emoji
    into the product UI.
-   **Motion:** Subtle transitions, audio waveform animation, status
    transitions and map/list transitions. Respect
    `prefers-reduced-motion`.
-   **Voice UI:** Make the microphone the primary visual interaction on
    the farmer flow. Show recording state, elapsed time, waveform, stop
    and playback controls.
-   **Language:** Farmer-facing copy should be short, plain and
    bilingual where useful. Do not publish machine-generated Odia copy
    without review by a fluent Odia speaker.

### Suggested design tokens

``` css
:root {
  --background: #F7F7F0;
  --surface: #FFFFFF;
  --surface-muted: #EEF2E9;
  --foreground: #17251D;
  --muted-foreground: #647168;
  --primary: #174B35;
  --primary-hover: #103D2A;
  --primary-soft: #E2EEE5;
  --accent: #D89A32;
  --warning: #A85C12;
  --warning-soft: #FFF2D9;
  --danger: #B83A35;
  --danger-soft: #FCE9E7;
  --border: #E2E7DF;
  --focus: #2D7D57;
  --radius-card: 18px;
}
```

These are starting tokens, not permission to use every colour
everywhere. Keep the interface calm and high-contrast.

### Design anti-patterns

-   No generic purple/blue AI gradient.
-   No dark dashboard as the default; use a light, calm operations UI.
-   No glassmorphism on every card.
-   No tiny text or low-contrast grey.
-   No giant decorative hero with no clear action.
-   No fake charts with arbitrary values.
-   No "AI-powered" labels repeated on every component.
-   No fake live status, fake vet availability or fake call-centre
    integrations.
-   No animation that delays a critical action.

------------------------------------------------------------------------

# 4. UI inspiration and Antigravity skills

Use these resources as references, not as a reason to copy another
product's design.

## Recommended agent skills

### A. Anthropic --- Frontend Design

**Use for:** Choosing a distinctive visual direction, typography,
composition and avoiding generic AI-generated UI.

-   Source:
    https://github.com/anthropics/skills/tree/main/skills/frontend-design
-   Antigravity installation guide:
    https://www.antigravityskills.org/skill/frontend-design
-   Antigravity project skills are documented under `.agents/skills/`;
    see https://antigravity.google/docs/rules

Ask Antigravity to inspect the source and install the skill into this
project. Review downloaded files before running any installation
commands.

### B. UI/UX Pro Max

**Use for:** Design-system recommendations, style/palette/font
selection, component guidance and UX checks.

-   Antigravity skill catalogue and install guidance:
    https://www.antigravityskills.org/antigravity-ui-ux-skills

Choose the current UI/UX Pro Max skill from its source page. Have
Antigravity inspect the source and install it into the project. Do not
install multiple competing design systems.

### C. Vercel --- Web Design Guidelines

**Use for:** Final UI audit covering accessibility, keyboard behaviour,
forms, interactions and responsive details.

-   Source:
    https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines

-   Guidelines: https://github.com/vercel-labs/web-interface-guidelines

-   Install command, if the Skills CLI detects Antigravity:

    ``` bash
    npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
    ```

### Optional component discovery

**21st.dev MCP** - https://21st.dev/mcp - Can search and install real
React components through an agent workflow. - Optional; do not let
component discovery override the established project design tokens.

**React Bits** - https://www.reactbits.dev/ - Useful for carefully
chosen motion and interaction components. - Use only a few details, such
as a subtle waveform or page transition. Do not turn the product into an
animation showcase.

**shadcn/ui** - https://ui.shadcn.com/ - Use as the accessible,
customizable component foundation. - Theming documentation:
https://ui.shadcn.com/docs/theming

## Skill installation prompt for Antigravity

Paste this into Antigravity before asking it to build:

> Inspect and recommend the current Antigravity-compatible versions of
> Anthropic Frontend Design, UI/UX Pro Max and Vercel Web Design
> Guidelines. Read their official source files and installation
> instructions. Explain what each skill adds, show the exact
> files/commands to be installed, and ask before executing commands that
> download or run scripts. Install only the three selected skills into
> this project if they are compatible. Do not install duplicate or
> competing UI frameworks. Confirm the skill files are visible to
> Antigravity.

------------------------------------------------------------------------

# 5. Technology stack

Use a straightforward monorepo or single repository. Keep the frontend
and backend clearly separated.

## Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   shadcn/ui
-   React Router
-   TanStack Query
-   React Hook Form + Zod
-   Lucide React
-   Framer Motion or Motion for small transitions only
-   Leaflet + OpenStreetMap for the map
-   Recharts for real dashboard aggregates only

## Backend

-   Python
-   FastAPI
-   Pydantic
-   SQLAlchemy
-   PostgreSQL
-   PostGIS for geographic queries
-   Redis only if background processing or session state genuinely
    requires it

## Gnani integration

Create provider adapters:

``` text
GnaniSpeechProvider
  └── Prisma: audio -> transcript

GnaniReasoningProvider
  └── Evon: transcript + context -> structured case extraction

GnaniVoiceProvider
  └── Timbre: approved response text -> audio
```

Do not hardcode guessed API URLs. Use official documentation and actual
credentials. Keep provider-specific request/response formats inside
adapter modules so the rest of the app is independent of API changes.

## Deployment

-   Docker for repeatable local setup.
-   Frontend and backend can be deployed separately.
-   Use a simple hosting provider suitable for a hackathon MVP.
-   Store secrets only in environment variables.
-   Never commit API keys or real farmer data.

## Suggested repository structure

``` text
JeevSetu/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── voice/
│   │   │   ├── cases/
│   │   │   └── maps/
│   │   ├── features/
│   │   │   ├── farmer/
│   │   │   ├── triage/
│   │   │   ├── dashboard/
│   │   │   └── directory/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── gnani/
│   │   │   ├── triage/
│   │   │   └── referrals/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── docs/
│   ├── product-scope.md
│   ├── api-contract.md
│   └── safety-and-triage.md
├── .env.example
├── docker-compose.yml
└── README.md
```

------------------------------------------------------------------------

# 6. User journeys and complete screen specification

Build in the order below. The homepage is the first screen and the case
confirmation is the end of the farmer journey. The veterinary dashboard
is the second complete journey.

## Screen 1 --- Public homepage (`/`)

**Purpose:** Explain the service and get a farmer to start reporting an
animal health concern.

### Layout

1.  Top navigation:
    -   Logo and wordmark: `JeevSetu`
    -   Links: How it works, For veterinary teams, About
    -   Language selector: ଓଡ଼ିଆ / हिन्दी / English
    -   Primary CTA: `Report an animal health concern`
2.  Hero section:
    -   Eyebrow: `VOICE-FIRST LIVESTOCK SUPPORT`
    -   Headline: `When your animal needs help, just speak.`
    -   Supporting text:
        `Describe what you are seeing in your own words. We help organise the information and connect you to veterinary support.`
    -   Primary CTA: `Start a voice report`
    -   Secondary CTA: `See how it works`
    -   Hero visual: a premium, cinematic 3D animated Indian village panorama. On the RIGHT, a young Indian village boy affectionately embraces a calf; both are expressive, warm, memorable family-film-style characters. On the LEFT, preserve clear negative space for the headline and CTA. Behind them: a peaceful village with small huts, farms, trees, distant green mountains and a nearby lake. Compose a natural tricolour sunrise: warm saffron/orange sunlight near the horizon, a soft ivory-white sky, and rich green grass/fields. The palette must feel like a beautiful morning landscape, not a literal flag or patriotic poster. Use the generated hero concept supplied by the user as the visual reference; refine rather than replace its core composition. Keep characters on the right and text-safe space on the left.
3.  Trust strip:
    -   `Speak naturally`
    -   `No long forms`
    -   `Veterinary review`
    -   Do not claim government approval or official partnership.
4.  How it works:
    -   Speak about the animal.
    -   Review the details.
    -   Share the case with a veterinary professional.
5.  Why voice:
    -   Large, readable explanation of voice-first access.
    -   Mention language support only for languages actually tested.
6.  Safety note:
    -   `This service does not replace a veterinarian. If an animal appears severely unwell, contact a qualified veterinary professional immediately.`
7.  Footer:
    -   About
    -   Privacy
    -   Safety
    -   Contact
    -   Demo label if this is a demonstration deployment.

### Interactions

-   Main CTA navigates to `/report`.
-   Language selector changes visible UI strings.
-   How it works scrolls to the relevant section.
-   Footer links navigate to real pages or valid sections.
-   Mobile navigation works and is keyboard accessible.

## Screen 2 --- Start a report (`/report`)

**Purpose:** Start a case with minimum friction.

### Layout

-   Simple top bar with logo, language selector and `Exit`.
-   Progress indicator: `1. Animal` → `2. Describe` → `3. Review`.
-   Title: `Tell us about the animal`.
-   Large selection cards:
    -   Cow
    -   Buffalo
    -   Goat
    -   Sheep
    -   Other
-   Optional animal name/identifier.
-   Optional approximate age group.
-   Optional milk-producing status.
-   CTA: `Continue`.

### Rules

-   Do not require every field.
-   Keep labels understandable.
-   Show selected state clearly.
-   Persist the draft locally while the user moves between steps.
-   If the user exits, confirm before discarding the draft.

## Screen 3 --- Voice capture (`/report/voice`)

**Purpose:** Capture the farmer's description.

### Main visual

A large microphone button in the centre with clear idle, recording,
processing and error states.

### Required controls

-   `Start recording`
-   `Stop`
-   `Listen to recording`
-   `Record again`
-   `Upload audio`
-   `Type instead`

### Recording behaviour

-   Request microphone permission only after the user presses record.
-   Show a clear permission-denied state and instructions.
-   Display elapsed recording time.
-   Show a live waveform only if it reflects actual microphone input.
-   Set a reasonable maximum recording duration and communicate it.
-   Do not silently upload audio.
-   Ask for consent before processing or storing audio.
-   If the browser does not support the required audio format, show a
    useful error and offer upload/text fallback.
-   Use accessible labels and keyboard controls.

### Language prompt

Ask the user to speak naturally. Do not force them to select a language
if the model can identify it reliably. If the language cannot be
identified, ask them to choose Odia, Hindi or another genuinely
supported option.

### Audio upload fallback

-   Accept common browser-supported audio formats.
-   Validate file type and size.
-   Show filename, duration if available, and remove/replace controls.
-   Explain that the file is used to create the case.

### Text fallback

-   Multiline text box.
-   Language selector.
-   Character count.
-   CTA: `Continue with description`.

## Screen 4 --- Processing (`/report/processing`)

**Purpose:** Make the AI pipeline understandable without pretending it
is instant or infallible.

Show a vertical progress sequence:

1.  `Receiving your recording`
2.  `Converting speech to text`
3.  `Organising the symptoms`
4.  `Checking configured warning signs`

Use real API status when connected. If the app is in demo mode, visibly
show `DEMO MODE — sample processing`.

### Failure handling

-   STT failure: offer retry, upload another file or type manually.
-   LLM failure: preserve the transcript and let the user continue with
    manual review.
-   Timeout: show retry without losing the recording.
-   Network failure: preserve draft state and explain what was not
    submitted.
-   Never invent a completed result when a provider call fails.

## Screen 5 --- Transcript and extracted details (`/report/review`)

**Purpose:** Let the farmer correct misunderstandings before submission.

### Layout

-   Heading: `Please check what we understood`.
-   Original transcript in a prominent editable text area.
-   Language label and processing source.
-   Extracted fields:
    -   Animal type
    -   Main symptoms described
    -   When the issue started
    -   Eating/drinking changes, if stated
    -   Milk production change, if stated
    -   Other details
-   Each field should be editable.
-   Unknown values must display `Not provided`, not guessed values.
-   Show a short explanation that speech recognition can make mistakes.
-   CTA: `Continue to safety check`.

### Important

The model must distinguish: - What the farmer explicitly said. - What is
unknown. - What is inferred and requires confirmation.

Do not silently convert uncertain statements into facts.

## Screen 6 --- Safety and urgency (`/report/urgency`)

**Purpose:** Highlight warning signs and escalate appropriately.

### Product behaviour

Use a deterministic rules engine based on a veterinarian-approved set of
red flags. The LLM may extract symptoms, but it must not be the final
authority for clinical urgency.

Possible UI states:

-   `Urgent veterinary attention recommended`
-   `Veterinary review recommended`
-   `More information needed`

These are workflow priorities, not diagnoses.

### UI elements

-   Clear urgency label.
-   Plain-language reason based only on configured rules and confirmed
    case information.
-   Immediate next-step instructions approved by a veterinary
    professional.
-   Prominent `Contact veterinary support` action only if a verified
    contact is configured.
-   If no verified contact is available, say so and instruct the user to
    contact their local qualified veterinary service.
-   Never display medicine or dosage recommendations.

### Emergency handling

If a configured critical warning sign is present, do not make the user
wait for the rest of the form. Display the escalation instruction
immediately.

## Screen 7 --- Location and contact (`/report/location`)

**Purpose:** Collect enough information for a human veterinary team to
follow up.

### Fields

-   Farmer name (optional if not required by the pilot).
-   Phone number (only if needed for follow-up).
-   District.
-   Block / village.
-   Landmark.
-   Use current location button.
-   Map pin adjustment where geolocation is available.
-   Consent checkbox for sharing the case with veterinary support.

### Rules

-   Ask permission before browser geolocation.
-   Do not require GPS if the farmer can enter a village or landmark.
-   Clearly explain why contact/location details are requested.
-   Do not collect Aadhaar or unnecessary personal data.
-   Keep sensitive data out of logs and analytics.

## Screen 8 --- Final review and submit (`/report/confirm`)

**Purpose:** Confirm the case before creating it.

Show a clean summary:

-   Animal details.
-   Transcript.
-   Confirmed symptoms.
-   Urgency status.
-   Location.
-   Contact details, if supplied.
-   Consent status.

Actions: - `Edit details` - `Submit case`

On submit: - Create a unique case ID. - Persist the case in the
database. - Save the status as `New`. - Record a timestamp. - Do not
claim a vet has been assigned unless assignment actually happened.

## Screen 9 --- Case submitted (`/case/:id/success`)

**Purpose:** Close the farmer journey with clarity.

Show: - Success state. - Case reference ID. - Summary of submitted
information. - Current status:
`Received — awaiting veterinary review`. - Next-step guidance. -
`View case summary` - `Return home`

If the backend is demo mode, label the case as a demonstration record.
Do not display a fake helpline number or claim a real referral.

------------------------------------------------------------------------

# 7. Veterinary operations dashboard

This is a separate operator experience. Desktop is the primary workspace, but mobile must remain functional. On phones, replace dense tables with stacked case cards and collapse navigation into a drawer or compact navigation bar.

## Screen 10 --- Operator login (`/operator/login`)

For the hackathon MVP, use a clearly labelled demo login or local demo
access. Do not build fake production authentication.

-   Product logo.
-   `Veterinary operations`
-   Demo access button.
-   Short security note.
-   No hardcoded production credentials.

## Screen 11 --- Dashboard overview (`/operator`)

### Navigation sidebar

-   Overview
-   Incoming cases
-   Veterinary directory
-   Reports
-   Settings

### Top bar

-   Search.
-   Date range.
-   Language indicator.
-   Operator profile/demo label.

### Main content

1.  Page title: `Veterinary operations`
2.  Subtitle:
    `Review incoming livestock cases and coordinate the next step.`
3.  KPI cards using actual database aggregates:
    -   New cases
    -   Urgent cases
    -   Awaiting review
    -   Resolved cases
4.  Incoming case table:
    -   Case ID
    -   Reported time
    -   Animal
    -   Village / district
    -   Language
    -   Urgency
    -   Status
    -   Action
5.  Recent activity timeline.
6.  Map preview of case locations only if real or clearly demo-labelled
    coordinates exist.

### Dashboard interactions

-   KPI cards link to filtered case lists.
-   Table rows open case detail.
-   Search works.
-   Filters work.
-   Empty state explains how to create a case.
-   Loading and error states are implemented.

## Screen 12 --- Incoming case queue (`/operator/cases`)

Filters: - All - New - Urgent - Awaiting review - Assigned - Resolved

Additional filters: - Date - District - Animal type - Language - Urgency

Table: - Case reference - Created time - Animal type - Main reported
issue - Location - Urgency - Status - Assigned reviewer - View action

Use pagination or sensible limits. Do not load an unlimited case list.

## Screen 13 --- Case detail (`/operator/cases/:id`)

This is the most important operator screen.

### Header

-   Case ID.
-   Urgency badge.
-   Status.
-   Created timestamp.
-   `Assign reviewer` or `Update status`.

### Main two-column layout

**Left column** - Farmer-provided animal details. - Transcript. - Audio
player, if consent and audio storage permit. - Extracted symptoms. -
Unknown/unconfirmed fields. - Location and map. - Contact information,
if consented.

**Right column** - Triage rule flags. - Why the case was flagged. -
Review checklist. - Assignment selector. - Status history. - Internal
notes.

### Status transitions

-   New
-   Under review
-   Assigned
-   Referral suggested
-   Follow-up needed
-   Resolved
-   Closed

A status update must persist to the backend and create a timestamped
status-history record.

### Safety

-   The operator can override the workflow priority with a required
    reason.
-   The app records who made the change in the demo/operator context.
-   The system must never display a generated diagnosis as confirmed
    veterinary advice.

## Screen 14 --- Veterinary directory (`/operator/vets`)

-   List and map view toggle.
-   Search by district, block or name.
-   Filters for service type.
-   Vet/service card:
    -   Name
    -   Facility/service type
    -   Address
    -   Phone only if verified
    -   Coordinates
    -   Availability only if verified
    -   Data source / verification label

For demo records, display `SAMPLE DATA — NOT A LIVE SERVICE`. Do not use
fake phone numbers that could accidentally belong to real people.

Use Leaflet + OpenStreetMap. Include attribution. If map tiles fail,
keep the directory list usable.

## Screen 15 --- Reports and analytics (`/operator/reports`)

Show only metrics derived from stored cases: - Cases by animal type. -
Cases by district. - Cases by urgency. - Cases by status. - Language
distribution. - Average time from submission to first review, only if
timestamps support it.

Every chart must have: - A title. - A date range. - A useful empty
state. - A clear data source label (`Demo data` or
`Live application data`).

Do not invent impact figures, money saved, disease prevalence or
diagnostic accuracy.

## Screen 16 --- Settings (`/operator/settings`)

MVP settings: - Language defaults. - Demo/live integration status. -
Gnani provider connection status. - Data retention note. - Safety
disclaimer. - About/version.

Do not expose secrets or API keys in the browser.

------------------------------------------------------------------------

# 8. AI pipeline and backend behaviour

## Pipeline

``` text
Farmer audio / typed description
          |
          v
Consent + file validation
          |
          v
Gnani Prisma adapter
Audio -> transcript
          |
          v
Transcript review / correction
          |
          v
Gnani Evon adapter
Transcript -> structured extraction
          |
          v
Pydantic schema validation
          |
          v
Veterinarian-approved deterministic rules
          |
          v
Case review + location + consent
          |
          v
PostgreSQL case record
          |
          v
Operator dashboard + human review
          |
          v
Optional Gnani Timbre spoken response
```

## Structured extraction schema

Use a strict schema similar to:

``` json
{
  "animal_type": "cow",
  "animal_identifier": null,
  "language": "odia_hindi_mixed",
  "symptoms_reported": [
    {
      "value": "not eating",
      "source_text": "exact supporting transcript fragment",
      "confidence": 0.91,
      "confirmed_by_farmer": false
    }
  ],
  "symptom_duration": null,
  "milk_production_change": null,
  "eating_or_drinking_change": "not eating",
  "other_observations": [],
  "unknown_fields": [
    "symptom_duration"
  ],
  "requires_human_review": true
}
```

This is an example contract, not a claim about what Evon returns
natively. Validate and normalise model output server-side.

## Triage engine

-   Store the rules in a dedicated module.
-   Rules must be reviewed by a qualified veterinarian before being
    presented as clinical guidance.
-   Keep the rules explainable.
-   Never let a generative model invent new emergency rules at runtime.
-   If information is missing or uncertain, escalate to human review
    rather than guessing.
-   Keep the original transcript and extracted fields separate.

## Gnani adapter design

Implement interfaces such as:

``` python
class SpeechProvider:
    async def transcribe(self, audio_file, language_hint=None):
        raise NotImplementedError

class ReasoningProvider:
    async def extract_case(self, transcript, animal_context):
        raise NotImplementedError

class VoiceProvider:
    async def synthesize(self, text, language):
        raise NotImplementedError
```

Create: - `GnaniPrismaProvider` - `GnaniEvonProvider` -
`GnaniTimbreProvider` - `DemoSpeechProvider` - `DemoReasoningProvider` -
`DemoVoiceProvider`

The demo providers must return visibly labelled demo results. Do not
silently fall back from a failed live API to fabricated success.

## Odia support gate

Before committing to Odia-first claims: 1. Check the exact current
Prisma language support in official Gnani documentation. 2. Test actual
Odia audio with the challenge API/model. 3. Test natural Odia/Hindi
code-mixing. 4. Record transcription errors. 5. Have a fluent Odia
speaker review the output. 6. If Odia is unsupported or unreliable,
label it experimental and do not claim native-level support.

Do not add a different STT provider without first documenting why the
Gnani-first route cannot support the required language. If a fallback is
needed, disclose it in the demo and architecture.

------------------------------------------------------------------------

# 9. Data model

Minimum tables:

## `cases`

-   `id`
-   `public_reference`
-   `animal_type`
-   `animal_identifier`
-   `language`
-   `transcript`
-   `audio_object_key` (nullable)
-   `audio_consent`
-   `symptom_extraction_json`
-   `urgency_level`
-   `urgency_reasons_json`
-   `district`
-   `block`
-   `village`
-   `landmark`
-   `latitude` (nullable)
-   `longitude` (nullable)
-   `farmer_name` (nullable)
-   `farmer_phone` (nullable)
-   `contact_consent`
-   `status`
-   `created_at`
-   `updated_at`

## `case_status_history`

-   `id`
-   `case_id`
-   `previous_status`
-   `new_status`
-   `reason`
-   `changed_by`
-   `created_at`

## `veterinary_services`

-   `id`
-   `name`
-   `service_type`
-   `address`
-   `district`
-   `phone`
-   `latitude`
-   `longitude`
-   `availability_status`
-   `verification_status`
-   `data_source`
-   `is_demo_record`

## `case_assignments`

-   `id`
-   `case_id`
-   `veterinary_service_id`
-   `assigned_operator`
-   `assigned_at`
-   `assignment_status`

Use migrations. Add indexes for case status, created date, district and
geographic lookup where useful.

------------------------------------------------------------------------

# 10. API contract

Build a small, documented API. Suggested routes:

``` text
GET    /api/health
GET    /api/integrations/status

POST   /api/audio/transcribe
POST   /api/cases/extract
POST   /api/cases/triage
POST   /api/cases
GET    /api/cases
GET    /api/cases/{case_id}
PATCH  /api/cases/{case_id}/status
POST   /api/cases/{case_id}/assign
GET    /api/veterinary-services
GET    /api/analytics/summary
```

Requirements: - Validate payloads with Pydantic. - Return useful error
messages. - Enforce upload size and MIME-type checks. - Use request
timeouts for provider calls. - Do not expose provider secrets. - Add
CORS only for the local/deployed frontend origins. - Document each
endpoint in OpenAPI/Swagger. - Do not claim that a route is connected to
a government system.

------------------------------------------------------------------------

# 11. Build sequence --- execute in order

## Phase 0 --- Repository and design plan

1.  Inspect the project.
2.  Confirm runtime versions and package manager.
3.  Read current Antigravity skill instructions.
4.  Produce the implementation plan and route map.
5.  Create design tokens and typography setup.
6.  Confirm the visual direction before building all pages.

**Gate:** No feature coding until the design tokens, route map and MVP
boundaries are clear.

## Phase 1 --- Design system and homepage

1.  Set up the frontend.
2.  Install and configure Tailwind and shadcn/ui.
3.  Add fonts with Odia glyph support.
4.  Build navigation, buttons, cards, badges, inputs, dialogs and
    toasts.
5.  Build the homepage exactly as Screen 1 specifies.
6.  Implement mobile navigation.
7.  Test desktop and mobile.

**Gate:** Homepage must look finished, not like a wireframe.

## Phase 2 --- Farmer report flow

1.  Build animal selection.
2.  Build voice capture.
3.  Add upload fallback.
4.  Add typed-description fallback.
5.  Add recording states and permission handling.
6.  Build transcript review.
7.  Build extracted-field review.
8.  Add location/contact form and consent.
9.  Build final confirmation and success page.
10. Test the complete farmer journey with demo data.

**Gate:** A case can be created and appears in the backend/database.

## Phase 3 --- Gnani integration

1.  Read current official Gnani API docs.
2.  Confirm API credentials and available models.
3.  Implement Prisma adapter.
4.  Test actual audio transcription.
5.  Implement Evon adapter.
6.  Validate structured JSON against the schema.
7.  Implement Timbre adapter if available.
8.  Add explicit provider status and error states.
9.  Keep demo adapters separate from live adapters.
10. Run Odia, Hindi and code-mixed tests.

**Gate:** Every live result is traceable to a real provider response.
Unsupported features are labelled honestly.

## Phase 4 --- Safety and triage

1.  Create the triage rules module.
2.  Add only veterinarian-reviewed rules.
3.  Add urgency labels and explanations.
4.  Add missing-information handling.
5.  Add human-review requirement.
6.  Test that the app never emits medicine or dosage recommendations.
7.  Test ambiguous and contradictory transcripts.

**Gate:** No autonomous diagnosis or treatment output.

## Phase 5 --- Veterinary dashboard

1.  Build demo operator access.
2.  Build dashboard overview.
3.  Build case queue.
4.  Add search and filters.
5.  Build case detail.
6.  Add status transitions and history.
7.  Build veterinary directory and map.
8.  Build reports using actual stored data.
9.  Add integration/settings status.

**Gate:** A farmer-created case can be reviewed and updated by the
operator.

## Phase 6 --- UI polish and responsiveness

1.  Inspect every route in the browser.
2.  Test mobile first at 360px, 390px and 412px; then test 768px, 1024px and 1440px.
3.  Fix layout overflow.
4.  Fix focus states and keyboard access.
5.  Test Odia glyph rendering and text wrapping.
6.  Check audio controls on mobile.
7.  Add loading, empty, error and success states.
8.  Add reduced-motion support.
9.  Remove placeholder content that looks like real data.
10. Check image licensing and attribution.

## Phase 7 --- QA and submission readiness

1.  Run frontend typecheck.
2.  Run lint.
3.  Run backend tests.
4.  Run production build.
5.  Test a complete farmer-to-operator case.
6.  Test live Gnani mode if credentials are available.
7.  Test demo mode without credentials.
8.  Test provider failure and network failure.
9.  Check that no secrets are committed.
10. Write README and demo instructions.
11. Record the 60-second demo only after the full flow works.

------------------------------------------------------------------------

# 12. Demo dataset and test cases

Seed a small set of clearly fictional cases. Add a persistent
`DEMO DATA` label in the UI when using them.

Test at least:

1.  Cow with reduced appetite.
2.  Buffalo with a reported change in milk production.
3.  Goat with a farmer-reported injury.
4.  Animal with an example of a configured emergency warning sign.
5.  Unclear audio with low transcription confidence.
6.  Code-mixed Odia/Hindi speech.
7.  Background noise such as road, wind or livestock sounds.
8.  Contradictory statements.
9.  Missing duration/location.
10. Unsupported or unintelligible language.

Do not create fake clinical certainty. For cases with unclear or
concerning information, the expected result should be human review.

------------------------------------------------------------------------

# 13. 60-second demo script

The video must show the actual product, not a cinematic mockup.

  Time         Scene
  ------------ ---------------------------------------------
  0--6 sec     Homepage and product statement
  6--14 sec    Farmer selects animal and starts recording
  14--23 sec   Real audio capture and Prisma transcription
  23--32 sec   Evon extracts structured symptoms
  32--40 sec   Safety rules show urgency and reason
  40--49 sec   Case submitted and reference generated
  49--56 sec   Operator opens the same case in dashboard
  56--60 sec   Product name and one-line impact statement

Use an actual tested audio clip. If the API is running in demo mode,
disclose it. Do not stage fake crying, claim an animal was diagnosed, or
imply that a real veterinarian was dispatched.

------------------------------------------------------------------------

# 14. Environment variables

Create `.env.example` with placeholders only:

``` env
# Frontend
VITE_API_BASE_URL=http://localhost:8000

# Backend
APP_ENV=development
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/JeevSetu
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:5173

# Gnani — fill only from official documentation/account
GNANI_API_KEY=
GNANI_PRISMA_MODEL=
GNANI_EVON_MODEL=
GNANI_TIMBRE_MODEL=
GNANI_API_BASE_URL=

# Provider mode: demo or live
AI_PROVIDER_MODE=demo

# Storage
AUDIO_STORAGE_MODE=local
AUDIO_STORAGE_PATH=./uploads

# Safety
TRIAGE_RULESET_VERSION=demo-v1
```

Do not assume the environment variable names above are Gnani's official
SDK requirements. They are application-level configuration names. Map
them to the real API contract inside the provider adapters.

------------------------------------------------------------------------

# Hackathon award strategy

The project is intended to compete across as many categories as the actual submission rules allow. This section is a strategy, not a claim of eligibility or a prediction of winning. Confirm the current official award criteria before submission.

| Award | Current fit | Evidence/features required |
|---|---|---|
| Main Character | Strong potential | Demonstrate a tested regional Indian language workflow (prioritise Odia only if Prisma performance is verified). |
| Mixed Vibes | Strong potential | Test natural Odia-English and/or Hindi-English code-switching; show real mixed-language utterances. |
| Real Deal | Strong potential | Validate the problem with livestock rearers and, where possible, veterinary professionals. Show a realistic end-to-end case. |
| Noise Canceller | Conditional | Record and test speech in realistic noisy/phone-like environments; report measured results rather than claiming noise robustness. |
| Two-Person Army | Not eligible if the submission remains solo | This category requires a two-person team. Do not misrepresent team size. |
| Solo Ninja | Direct fit if rules confirm solo participation | Maintain clear evidence that one person built the submission. |
| Jugaad Genius | Strong potential | Make Gnani models central to the workflow and explain the creative, practical integration. |
| Small Town Big Build | Potential | Ground the story in Bhubaneswar/Odisha and show locally relevant problem discovery; verify the category's geographic definition. |
| Demo Day Drop | Strong potential | Prepare a clear, reliable 60-second demo with a visible before/after transformation from spoken report to structured case. |
| Crowd Favourite | Uncertain | Use a memorable story, polished demo and clear public-facing explanation; audience voting is not controllable. |

## Prioritisation

1. **Real Deal:** interview actual livestock rearers and at least one veterinary professional; document the problem and validate the workflow.
2. **Main Character:** test regional-language speech recognition and the full user flow with real speakers.
3. **Jugaad Genius:** show exactly what Prisma, Evon and Timbre each contribute; avoid superficial API usage.
4. **Mixed Vibes:** test genuine code-switching, not just separate language demos.
5. **Demo Day Drop:** build a deterministic, rehearsed demo path that does not depend on unstable live network calls.
6. **Noise Canceller:** add only after the core workflow works; measure transcription quality across quiet and noisy samples.
7. **Small Town Big Build / Crowd Favourite:** strengthen with authentic local validation and concise storytelling.

The user is participating solo, so **Two-Person Army is excluded** unless the team composition changes and the rules permit it. “8 of 9 possible categories” is an aspiration based on the discussed category list, not a guaranteed eligibility count. Do not distort the product to chase categories. One robust end-to-end workflow is more valuable than ten disconnected features.

## Demo proof points

The 60-second demo should show:
- A farmer speaking naturally in a tested language or code-mixed form.
- A real Prisma transcription, clearly distinguished from demo-mode fallback.
- Structured symptom extraction through the configured Gnani integration, where available.
- Deterministic red-flag evaluation using the veterinarian-approved ruleset.
- A human-review referral/case record appearing in the operator queue.
- A clear farmer-facing next step in the selected language.

Never fake live model calls, veterinary acceptance, dispatch or impact metrics. If a step is simulated, label it `DEMO MODE` on screen and in the narration.

------------------------------------------------------------------------

# 15. Final quality checklist

## Product

-   [ ] Homepage explains the product clearly.
-   [ ] Farmer can create a case.
-   [ ] Voice, upload and text input work.
-   [ ] Transcript can be corrected.
-   [ ] Extracted information is structured and reviewable.
-   [ ] Triage is deterministic and veterinarian-reviewed.
-   [ ] Case is saved.
-   [ ] Operator can find and update the case.
-   [ ] Directory distinguishes verified and demo records.

## Gnani

-   [ ] Prisma is called through a provider adapter.
-   [ ] Evon is called through a provider adapter.
-   [ ] Timbre is called only if supported and configured.
-   [ ] No invented endpoints or fabricated live outputs.
-   [ ] Odia performance is tested and honestly reported.
-   [ ] Provider failures do not destroy the user's draft.

## UI

-   [ ] Consistent visual tokens.
-   [ ] Desktop, tablet and mobile layouts work.
-   [ ] Odia fonts render correctly.
-   [ ] Keyboard and screen-reader basics work.
-   [ ] Audio controls are usable.
-   [ ] Every button has a real action.
-   [ ] Loading, empty, error and success states exist.
-   [ ] No generic AI dashboard aesthetic.

## Safety and privacy

-   [ ] No autonomous diagnosis.
-   [ ] No medication or dosage advice.
-   [ ] Human veterinary review is clear.
-   [ ] Consent is captured before audio storage/processing.
-   [ ] Sensitive data is not logged.
-   [ ] Demo records are clearly marked.
-   [ ] No fake government or veterinary partnership claims.

## Engineering

-   [ ] Frontend typecheck passes.
-   [ ] Backend tests pass.
-   [ ] Production build passes.
-   [ ] README contains setup instructions.
-   [ ] `.env.example` exists.
-   [ ] No secrets committed.
-   [ ] Complete end-to-end demo tested.

------------------------------------------------------------------------

# 16. Final instruction to Antigravity

Build the product in the exact phase order above. Start with repository inspection and a short implementation plan. Establish the mobile design system and complete the farmer journey at phone width before building desktop enhancements or the operator dashboard. Do not build every page at desktop width and shrink it afterward.

The quality bar is a cohesive, beautiful, functional mobile-first MVP with a complete farmer-to-veterinary-operator workflow. The farmer flow must work exceptionally well on a phone before desktop enhancements. Prioritise reliability, visual craft, language clarity and honest AI integration over feature count.

When a phase is complete: 1. Run the relevant checks. 2. Open the actual
page in the browser. 3. Inspect desktop and mobile screenshots. 4. Fix
visual and functional defects. 5. Summarise what works, what is still
mocked and what needs credentials or external verification. 6. Continue
to the next phase.

**The final product must feel like a real product, while remaining
honest about what is and is not connected.**


---

# 17. Exact step-by-step Antigravity execution protocol

**Do not ask Antigravity to build the entire application in one prompt.** Submit one prompt at a time. Inspect the result, run checks and pass the gate before continuing. Do not silently skip a failed gate.

## Step 1 — Repository inspection and plan (no feature coding)

- Inspect repository, framework, scripts, dependencies, environment variables and existing UI.
- Read this entire brief and relevant installed skill instructions.
- Return architecture proposal, route map, component map, minimum data model, dependency plan, Gnani unknowns, safety/privacy risks and implementation sequence.
- Do not install packages, run remote scripts or make destructive changes until approved.

**Gate:** Plan is coherent; existing working code is not overwritten without justification.

## Step 2 — Mobile design foundation

- Configure JeevSetu design tokens, typography, verified Odia glyph support and mobile breakpoints.
- Build global mobile shell, compact navigation, buttons, cards, inputs, alerts, progress stepper and loading/error states.
- Design at 390px first; verify 360px and 412px.

**Gate:** No horizontal overflow; text, controls and touch targets are usable.

## Step 3 — Homepage and hero

- Build the homepage mobile-first.
- Create a narrow responsive crop of the supplied boy-and-calf village hero; keep both characters visible on phones.
- On desktop retain characters on the right and text-safe space on the left.
- Implement real navigation, language selector, sections and report CTA.

**Gate:** Homepage is polished and readable on phone and desktop; CTA enters the report flow.

## Step 4 — Complete farmer journey with demo data

- Build animal selection, voice capture, audio upload, text fallback, processing, transcript correction, extracted-field review, safety result, location/contact consent, final review and success screens.
- Use clearly labelled DEMO MODE responses only.
- Implement real navigation, validation, Back/Continue, draft preservation and duplicate-submit prevention.
- Do not connect live AI yet.

**Gate:** A tester can complete the entire farmer journey at 360–390px without dead ends.

## Step 5 — Backend and persistence

- Implement the minimum FastAPI service, database models, migrations and case APIs.
- Persist cases, status history, consent and only necessary contact/location data.
- Connect the existing farmer UI to the API.
- Add validation, safe retries, duplicate-submit prevention and useful error states.

**Gate:** A submitted case persists and can be retrieved after refresh and backend restart.

## Step 6 — Gnani provider verification and integration

- Read current official Gnani documentation. Verify actual credentials, API contracts, model availability, supported languages and audio constraints.
- Implement Prisma first, then Evon, then Timbre only if available and useful.
- Keep demo and live providers separate; expose integration status.
- Test real Odia, Hindi, code-mixed and noisy recordings; document limitations.

**Gate:** Every live output comes from a real provider response. Unsupported capabilities are disclosed.

## Step 7 — Safety and human review

- Implement only veterinarian-reviewed deterministic rules.
- Keep model extraction separate from urgency decisions.
- Add human-review workflow, explainable flags and audit trail.
- Test uncertainty, contradictory input and missing information.

**Gate:** No autonomous diagnosis, medication or dosage advice can reach the farmer.

## Step 8 — Operator console

- Build demo access, overview, incoming queue, search/filters, case detail, status history, directory/map and data-backed reports.
- Desktop-first is acceptable; mobile must use stacked case cards and compact navigation.
- Mark seeded providers, availability and simulated assignments as DEMO DATA.

**Gate:** An operator can review and update the same case submitted through the farmer flow.

## Step 9 — End-to-end integration and mobile QA

- Test the full farmer-to-operator journey on real Android Chrome where possible.
- Test microphone permissions, recording, playback, upload, network loss, retry, draft recovery and duplicate submission.
- Inspect 360px, 390px and 412px first; then tablet and desktop.
- Check accessibility, Odia rendering, reduced motion, performance and browser console/network errors.

**Gate:** No critical flow breaks, no horizontal overflow and no fake live status.

## Step 10 — Submission hardening

- Run frontend typecheck, lint, backend tests and production build.
- Audit secrets, environment variables, demo/live labels, privacy and safety disclaimers.
- Prepare README, setup guide, known limitations and tested demo script.
- Record the 60-second demo only after the flow is stable.

**Gate:** A clean setup reproduces the demo; every simulated step is clearly disclosed.

---

# 18. Prompt pack — paste one prompt at a time

Keep this Markdown file available in Antigravity as the single source of truth. Submit these prompts in order. Do not combine them into one giant request.

## Prompt 1 — Inspect and plan

> Read `JeevSetu_MOBILE_FIRST_ANTIGRAVITY_BUILD_BRIEF.md` completely. Do not start feature coding. Inspect the repository, framework, scripts, dependencies, existing UI and environment. Do not overwrite working code.
> Return a repository audit, architecture proposal, route map, component map, minimum data model, dependency plan, Gnani integration unknowns, safety/privacy risks and exact 10-step implementation plan from the brief.
> The farmer experience is mobile-first: use 390px as baseline and verify 360px and 412px. The operator console may be desktop-first.
> Do not install packages, run remote scripts or make destructive changes until I approve. Stop after presenting the plan.

## Prompt 2 — Mobile design system

> Implement Step 2 only. Establish JeevSetu tokens, typography with verified Odia glyph coverage, responsive breakpoints, accessible controls, mobile page shell, compact navigation, farmer stepper and form/action patterns.
> Design at 390px first, then verify 360px and 412px. Do not build the full homepage, farmer workflow, backend or dashboard yet.
> Run checks, inspect the browser at required widths, fix overflow and touch-target issues, report what works and stop at the Step 2 gate.

## Prompt 3 — Homepage and hero

> Implement Step 3 only: the JeevSetu homepage from the brief.
> Mobile-first: create a narrow crop of the supplied boy-and-calf village hero so both characters remain visible. On desktop preserve the boy and calf on the right and text-safe space on the left. Use ivory sky, saffron sunrise and green landscape naturally, not as flag stripes.
> Build working navigation, language selector, homepage sections, safety note and report CTA. Do not build the report flow or dashboard.
> Verify 360px, 390px, 412px and desktop. Fix defects and stop at the Step 3 gate.

## Prompt 4 — Farmer flow with demo data

> Implement Step 4 only: the complete farmer journey using explicitly labelled DEMO MODE data.
> Build animal selection, voice capture, upload fallback, text fallback, processing, transcript correction, extracted-field review, safety result, location/contact consent, final review and case confirmation.
> Mobile-first at 390px; verify 360px and 412px. Implement real navigation, validation, Back/Continue, draft preservation and duplicate-submit prevention. Do not fake live transcription or connect Gnani yet.
> Test the complete journey from homepage CTA to confirmation. Fix failures and stop at the Step 4 gate.

## Prompt 5 — Backend and persistence

> Implement Step 5 only: FastAPI backend, database models, migrations and API integration for case creation, retrieval and status history.
> Keep the schema minimal and privacy-conscious. Connect the existing farmer UI and preserve its mobile design. Add validation, safe retries, duplicate-submit prevention and useful error states.
> Do not integrate live Gnani yet. Prove a case remains available after refresh and backend restart. Run tests and stop at the Step 5 gate.

## Prompt 6 — Gnani integration

> Implement Step 6 only. First inspect current official Gnani documentation and credentials actually available. Verify exact Prisma, Evon and Timbre API contracts, supported languages, audio formats and model access. Do not guess endpoints, SDK names or capabilities.
> Implement adapters only for verified capabilities. Keep DEMO MODE separate and visibly labelled. Test actual Odia, Hindi, code-mixed and noisy recordings; record limitations.
> Preserve farmer drafts when providers fail. Run integration tests and stop at the Step 6 gate.

## Prompt 7 — Safety and human review

> Implement Step 7 only: deterministic safety workflow and human-review requirements.
> Do not invent clinical rules. Use only rules explicitly approved by a qualified veterinarian; otherwise show that clinical rules are not configured and require human review.
> Ensure model extraction cannot independently determine diagnosis or treatment. Prohibit medication names, doses, injections and treatment instructions. Add explainable flags, uncertainty handling, audit trail and tests for ambiguous/contradictory input.
> Verify the safety boundary and stop at the Step 7 gate.

## Prompt 8 — Operator console

> Implement Step 8 only: the veterinary operations experience.
> Build demo access, overview, incoming queue, search/filters, case detail, status history, directory/map and reports based only on stored records.
> Desktop-first is acceptable, but on mobile replace dense tables with stacked case cards and compact navigation. Mark seeded providers, availability and simulated assignments as DEMO DATA.
> Prove an operator can review and update the same case submitted through the farmer flow. Stop at the Step 8 gate.

## Prompt 9 — End-to-end mobile QA

> Implement Step 9 only: integration and quality assurance.
> Test the full farmer-to-operator flow on a real Android device or real-device browser environment if available. Test microphone permission, recording, playback, upload, text fallback, poor connectivity, retry, draft recovery and duplicate submission.
> Inspect 360px, 390px and 412px first, then tablet and desktop. Check accessibility, Odia text rendering, reduced motion, performance, console/network errors and navigation.
> Fix defects rather than only listing them. Report tests performed and unverified device/browser limitations. Stop at the Step 9 gate.

## Prompt 10 — Submission hardening and demo

> Implement Step 10 only: submission readiness.
> Run frontend typecheck, lint, backend tests and production build. Audit secrets, environment variables, setup instructions, demo/live labels, privacy and safety disclaimers.
> Prepare a reproducible README and reliable 60-second demo showing the actual working product. Never fake a live Gnani response, veterinary acceptance, dispatch or impact metric. Disclose every simulated step.
> Report final feature status as LIVE, DEMO or NOT IMPLEMENTED. Stop after the final checklist and submission handoff.

## Required report after every prompt

Antigravity must report:
1. Files created or changed.
2. Features that actually work.
3. Commands/tests executed and pass/fail results.
4. Browser/device widths inspected.
5. What remains mocked, blocked or unverified.
6. Whether the current step's gate passes.

Do not proceed if the current gate fails. Fix it first. Do not silently replace JeevSetu, expand the MVP, invent Gnani capabilities or weaken the clinical safety boundary.

---

