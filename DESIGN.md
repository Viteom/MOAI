---
name: MOAI
description: Cuidado social contra la soledad; planes del barrio en un bosque de vidrio y un mapa en tinta con postales.
colors:
  bosque: "oklch(.17 .022 165)"
  bosque-alto: "oklch(.22 .03 162)"
  niebla: "oklch(.93 .015 150)"
  lima: "oklch(0.82460 0.17617 121.113)"
  cian: "oklch(.84 .12 205)"
  barrio-papel: "oklch(.955 .02 140)"
  barrio-papel-hoja: "oklch(.985 .008 140)"
  barrio-tinta: "oklch(.3 .06 160)"
  barrio-tinta-suave: "oklch(.48 .045 158)"
  barrio-celda-0: "oklch(.87 .1 128)"
  barrio-celda-1: "oklch(.925 .04 138)"
  barrio-celda-2: "oklch(.945 .025 142)"
  barrio-noche-papel: "oklch(.2 .035 165)"
  barrio-noche-papel-hoja: "oklch(.24 .035 165)"
  barrio-noche-tinta: "oklch(.9 .03 140)"
  barrio-noche-tinta-suave: "oklch(.74 .035 145)"
  barrio-noche-celda-0: "oklch(.42 .1 135)"
  barrio-noche-celda-1: "oklch(.27 .04 160)"
  barrio-noche-celda-2: "oklch(.235 .035 163)"
  tinta-semana: "oklch(.45 .09 168)"
  lavado-semana: "oklch(.9 .045 165)"
  tinta-semanal: "oklch(.52 .1 210)"
  lavado-semanal: "oklch(.92 .05 210)"
  tinta-mio: "oklch(.52 .15 130)"
  lavado-mio: "oklch(.9 .1 125)"
  tinta-convocatoria: "oklch(.6 .15 50)"
  lavado-convocatoria: "oklch(.92 .06 55)"
  noche-tinta-semana: "oklch(.8 .08 165)"
  noche-lavado-semana: "oklch(.3 .05 165)"
  noche-tinta-semanal: "oklch(.82 .1 200)"
  noche-lavado-semanal: "oklch(.31 .05 205)"
  noche-tinta-mio: "oklch(.88 .18 125)"
  noche-lavado-mio: "oklch(.34 .08 128)"
  noche-tinta-convocatoria: "oklch(.8 .12 55)"
  noche-lavado-convocatoria: "oklch(.33 .06 50)"
typography:
  display:
    fontFamily: "Fraunces, serif"
    fontSize: "clamp(24px, 2.4vw, 32px)"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Fraunces, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Fraunces, serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.35
  body-emphasis:
    fontFamily: "Inter, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.01em"
  wordmark:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "0.4em"
rounded:
  vineta: "4px"
  postal: "6px"
  nota: "14px"
  aviso: "18px"
  hoja: "22px"
  vidrio: "28px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "22px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.lima}"
    textColor: "{colors.bosque}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-outline-noche:
    backgroundColor: "transparent"
    textColor: "{colors.niebla}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-outline-dia:
    backgroundColor: "transparent"
    textColor: "{colors.barrio-tinta}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  modo-dia-activo:
    backgroundColor: "{colors.barrio-tinta}"
    textColor: "{colors.barrio-papel-hoja}"
    rounded: "{rounded.pill}"
    height: "40px"
  barra-dia:
    backgroundColor: "{colors.barrio-papel-hoja}"
    textColor: "{colors.barrio-tinta}"
    rounded: "{rounded.hoja}"
    height: "64px"
  barra-dia-activo:
    backgroundColor: "{colors.barrio-celda-0}"
    textColor: "{colors.barrio-tinta}"
    rounded: "{rounded.pill}"
    height: "48px"
  hoja:
    backgroundColor: "{colors.barrio-papel-hoja}"
    textColor: "{colors.barrio-tinta}"
    rounded: "{rounded.hoja}"
    padding: "16px 16px 24px"
  postal:
    backgroundColor: "{colors.barrio-papel-hoja}"
    textColor: "{colors.barrio-tinta}"
    rounded: "{rounded.postal}"
    padding: "14px"
  postal-vineta:
    rounded: "{rounded.vineta}"
    width: "84px"
    height: "72px"
  sello:
    size: "66px"
    rounded: "{rounded.pill}"
  mapa-sello:
    backgroundColor: "{colors.barrio-papel-hoja}"
    size: "52px"
    rounded: "{rounded.pill}"
---

# Design System: MOAI

## Overview

**Creative North Star: "El barrio en tinta y el bosque de noche"**

MOAI lives in two worlds that share one bar, one pair of typefaces and one lime. The incumbent world is a night forest: a near-black green ground, translucent grained glass panels, mist-coloured text and a single lime light. It carries Brisa's conversation over the illustrated city, Mi gente's ink-thread network, the reading screens and the shared bar. Mi barrio is the second world: a hand-inked map on sage paper, made only of honest H3 hex cells labelled with real barrio names, with a stack of plan postcards beside it (desktop) or rising from below (phone). The light follows the hour: from 06:00 to 18:00 the drawing is forest ink on sage paper; after dark the same drawing is redrawn in light ink on forest. Nothing in the drawing moves except the one ink stroke that runs from «Tú» to the chosen plan.

Density is low and type is large, because many users are older: body text starts at 16px, every control is at least 44px tall and the main actions are 48px pills. One thing at a time: a single lime primary action per region, one postcard selected at a time, and the map and postcards always agree about which plan that is.

The confirmed rejections come from the Mi barrio direction: no fake illustrated scene with tiny pins, no generic street map, and never anything that shows where a person lives.

**Key Characteristics:**
- Two worlds, one system: glass on forest for Brisa, Mi gente and the reading screens; ink on paper (day) or ink on forest (night) for Mi barrio.
- Light follows the hour in Mi barrio; the drawing never changes, only its tokens do.
- One ink per plan type, shared by the postcard, its seal and its stamp on the map.
- Fraunces speaks (titles, seals, «Tú»); Inter works (everything you read to act).
- Lime marks the main action and what is yours.
- Large type and 44–48px targets throughout.

## Colors

A deep-green palette in OKLCH: forest and mist for the night world, sage paper and forest ink for the barrio by day, and four plan inks that each carry a matching pale (day) or deep (night) wash.

### Primary
- **Lima Viva** (lima): the only accent. Fills the primary pill («Me sumo», «Tengo ganas de…»), the incumbent focus ring on forest, the active place in the bar on forest, the IA seal, and the «yours» ink family in Mi barrio. Dark forest text on lima (11.5:1).

### Secondary
- **Cian Rocío** (cian): the cool second light of the forest world (aviso borders on the reading screens); in Mi barrio its role passes to the weekly-plan ink.

### Plan inks (Mi barrio)
Each plan type owns one ink and one wash; the postcard frame, vignette wash, postcard seal, map stamp and the «when» line all take that pair.
- **Verde Semana** (tinta-semana on lavado-semana; noche-tinta-semana by night): one-off plans this week. A teal-leaning forest green, kept apart from the paper and cell greens.
- **Cian Semanal** (tinta-semanal / lavado-semanal): plans that repeat every week.
- **Lima Tuyo** (tinta-mio / lavado-mio): plans you proposed or joined. By day a deep olive-lime so it reads on paper; by night the bright lime.
- **Naranja Convocatoria** (tinta-convocatoria / lavado-convocatoria): calls from verified entities.

### Neutral
- **Bosque** (bosque) and **Bosque Alto** (bosque-alto): the night ground and its raised fields (forms, notices) in the incumbent world.
- **Niebla** (niebla): all text on forest (15.6:1 on bosque).
- **Papel Salvia** (barrio-papel): the Mi barrio ground by day; also the ring-label backing on the map.
- **Hoja** (barrio-papel-hoja): the postcard sheet, the postcards, map stamps, and the bar when it sits on paper.
- **Tinta Bosque** (barrio-tinta): headings, cell strokes, the «Tú» dot, the active segmented option (12.8:1 on Hoja).
- **Tinta Suave** (barrio-tinta-suave): secondary text, outer-ring strokes and outer barrio names (6.1:1 on Hoja).
- **Celdas** (barrio-celda-0, -1, -2): the three rings of cells, from your own cell (fresh lime-sage) outward to almost-paper. Celda-0 also marks the current place in the bar by day.
- The **noche** variants of paper, sheet, ink and cells are the same roles redrawn on forest.

### Named Rules
**The Light Follows the Hour Rule.** Mi barrio is day from 06:00 to 18:00 and night otherwise. The two states swap token values only; geometry, layout and components stay identical.

**The One Ink per Plan Rule.** A plan's type picks one ink and one wash, and every mark that belongs to that plan uses that pair and nothing else. Lime always means «yours».

**The Lime Is Rare Rule.** Lime fills the single primary action of a region and the «yours» family, and marks the current place, focus on forest and the IA seal. It never becomes a background wash for whole panels.

## Typography

**Display Font:** Fraunces (with serif)
**Body Font:** Inter (with sans-serif)

**Character:** Fraunces is the warm, postal voice: screen titles in Mi barrio, the sheet heading, postcard titles, the seal's hour and «Tú» on the map. Inter does the work: when, where, who, buttons, the bar, barrio names.

### Hierarchy
- **Display** (Fraunces 700, clamp(24px, 2.4vw, 32px), 1.1): the «Mi barrio» screen title. The forest reading screens and Brisa's panel set their h1 in Inter 700 (clamp(30px, 3vw, 40px) and 26px).
- **Headline** (Fraunces 600, 24px, 1.15): the sheet heading «Esta semana, cerca».
- **Title** (Fraunces 600, 20px, 1.2, balanced wrap): postcard titles. «Tú» on the map uses Fraunces 600 at 18px.
- **Body** (Inter 400, 16px, 1.35): postcard detail (where, distance band); 15px for «who proposes».
- **Body emphasis** (Inter 600, 17px): the «when» line of a postcard, in the plan's ink.
- **Label** (Inter 600, 15px on phone; 500 at 13px on desktop, 1.15): barrio names inside cells, max 11ch, centred, broken over two lines.
- **Wordmark** (Inter 600, 15px, 0.4em tracking): «MOAI» in the bar only.

### Named Rules
**The Fraunces Speaks, Inter Works Rule.** Fraunces is reserved for titles, seals and «Tú». Anything a person reads in order to act (when, where, buttons, navigation) is Inter.

**The Large Print Rule.** Running text is at least 16px and actionable labels at least 15px. Smaller lettering exists only inside the decorative seal and map labels, and it is not a type role (see Don'ts).

## Layout

**Mi barrio, desktop (900px and up):** two columns below the controls row: the ink map on the left (flexible, centred, scaled to fit the full height) and the postcard column on the right at min(460px, 38vw), always visible and scrolling on its own, separated by a hairline of ink at 15%. The screen fills exactly the viewport under the top bar (92px reserved).

**Mi barrio, phone (up to 899px):** the map fills the background and is zoomed past the frame (about 2x) so the inner rings and their names are legible; outer-ring names and long names are hidden. A sheet rises from above the bottom bar in three button-driven heights: half (56%), open (all but 8px; the map hides) and collapsed (204px). No drag is ever required. The page title is visually hidden; the place selector and the Planes · Vecinos toggle each take a full row.

**Shared bar:** fixed at the top on desktop (inset 14px, 64px tall, 22px radius) and docked to the bottom on phone (56px buttons, icon over label, top corners 22px).

**Rhythm:** gaps of 8, 10, 14 and 16px inside components; 22–24px of padding at desktop edges, 14–16px on phone. Postcard stacks and sheet blocks use 14px gaps.

## Elevation & Depth

Two depth languages. The forest world is layered glass: translucent forest at 34% with an 18px blur, a fine grain overlay, a white hairline and a deep ambient shadow. Mi barrio is paper: flat sheets lifted only by soft, negative-spread shadows tinted with ink, never black and never offset hard.

### Shadow Vocabulary
- **Glass panel** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / .16), 0 18px 50px rgb(4 18 14 / .35)`): .vidrio panels on forest.
- **Postal at rest** (`box-shadow: inset 0 0 0 4px var(--papel-hoja), inset 0 0 0 5px color-mix(in oklab, var(--c) 30%, transparent), 0 6px 16px -10px color-mix(in oklab, var(--tinta) 60%, transparent)`): an inner printed frame in the plan's ink plus a low lift.
- **Postal chosen** (`inset 0 0 0 4px var(--papel-hoja), inset 0 0 0 6px var(--c), 0 12px 24px -12px color-mix(in oklab, var(--tinta) 70%, transparent)` with translateY(-2px)).
- **Map stamp** (`0 3px 8px -2px color-mix(in oklab, var(--tinta) 45%, transparent)`); chosen: a paper gap ring, an ink ring and a deeper lift.
- **Phone sheet** (`0 -10px 30px -12px color-mix(in oklab, var(--tinta) 50%, transparent)`).
- **Bar on paper** (`0 6px 18px -10px color-mix(in oklab, var(--tinta) 45%, transparent)`).

### Named Rules
**The Paper Lies Flat Rule.** On paper, shadows are soft, negative-spread and tinted with ink; selection is shown with the plan's ink ring, not with a heavier shadow alone.

**The Solid Bar on Paper Rule.** Where the bar sits on Mi barrio's daytime paper it turns into a solid sheet (Hoja, ink hairline at 18%, no blur, no grain) with Tinta Bosque text. On forest, including Mi barrio at night, it stays glass. Brisa's conversation panel stays glass in both worlds: glass is Brisa's material.

## Shapes

Hexagons and circles on paper. Map cells are honest H3 hexagons with ink strokes (1.6px, 2.4px for your own cell) passed through a turbulence displacement so the line trembles like a pen. Two dotted circles (2 7 dash, round caps) mark «cerca» and «tu zona», labelled in Fraunces italic on a paper pill. Seals and stamps are circles: a solid outer ring and a dashed inner ring, with postmark waves beside the postcard seal. Postcards are almost square-cornered (6px) with a 4px vignette tile; the sheet and the bar round to 22px; Brisa's glass rounds to 28px; every button and chip is a full pill.

## Components

### Buttons
Large, round and calm.
- **Shape:** full pill (999px), at least 48px tall.
- **Primary:** lima with dark forest text, 600 weight, 17px. One per region («Me sumo», «Tengo ganas de…» with a pencil icon at 52px tall, full width in the sheet).
- **Outline:** transparent with a 1.5px border; mist text on forest, Tinta Bosque text and a 40% ink border on paper.
- **Text link:** underlined 15px, 44px tall target («Ver detalles», «¿Por qué veo esto?»).
- **Focus:** 3px outline; lime on forest, Tinta Bosque on paper (3px offset).

### Segmented toggle (Planes · Vecinos)
A pill track with 40px options. By day the active option is solid Tinta Bosque with Hoja text on a Hoja track; by night it is a translucent green fill with a lime inset hairline on a forest track.

### Place selector
A 48px pill («Estás en: Casa · Laureles» with a chevron) that opens a rounded list of 48px rows. Paper-coloured by day, forest by night.

### Navigation (the bar)
One bar for every private screen: Brisa · Mi barrio · Mi gente · Más, with outline icons. On forest the current place is a lime-tinted pill with a lime hairline; on daytime paper it is a Celda-0 pill with an ink hairline. Desktop shows the spaced «MOAI» wordmark; phone hides it and stacks icon over 13px label.

### Postal (signature)
The unit of Mi barrio. A Hoja card (6px radius, 14px padding, 22% ink hairline) whose whole face is one button: an 84x72 vignette tile washed in the plan's colour with a small ink drawing of people doing the plan (walking, coffee, garden, chess, knitting, errands, volunteering), then the title in Fraunces, the «when» line in the plan's ink, where and distance band, and who proposes. The seal sits top-right, rotated -9°. Actions sit below: the primary pill and a text link. Choosing a postcard lifts it, thickens its inner ink frame, and highlights its stamp on the map. At 420px and below the vignette shrinks to 64x58.

### Sello / mapa-sello (signature)
The seal joins postcard and map. On the postcard: a 66px circle in the plan's ink with short weekday, the hour in Fraunces 700 and «a. m./p. m.», plus postmark waves. On the map: the same ring as a 52px Hoja button (44px on phone) holding the plan's vignette, rotated -6°, with a pill below showing day and hour in the plan's ink. Chosen, it straightens, scales up (1.28 desktop, 1.15 phone), gains a paper gap and an ink ring, and an ink stroke draws from «Tú» to it over 0.7s (cubic-bezier(.16, 1, .3, 1)); with reduced motion the stroke simply appears.

### Hoja (sheet)
The postcard column on desktop; on phone the rising sheet with 22px top corners and a toggle button («Ver todos los planes» / «Ver el mapa») instead of a drag handle. Brisa's note inside it is a 14px-radius block washed with Celda-0 at 35%.

### Glass panel (incumbent)
Translucent forest at 34%, 18px blur and 1.25 saturation, white hairline at 32%, grain overlay at 16% opacity, 28px radius. Brisa's conversation opens as this panel from her orb in the map's top-right corner.

## Do's and Don'ts

### Do:
- **Do** draw only what is true on the map: H3 cells, real barrio names, the two dotted rings and «Tú». Plans appear as stamps placed inside their cell.
- **Do** switch Mi barrio between day and night by the hour, swapping token values only.
- **Do** give every mark of a plan the same ink and wash: frame, vignette tile, seal, map stamp and «when» line.
- **Do** keep the postcard seal and the map stamp the same object, so choosing either highlights both.
- **Do** keep primary actions as 48px lime pills and every other target at least 44px.
- **Do** offer a button for every sheet height change; never require a drag.
- **Do** turn the bar into solid paper where it sits on Mi barrio's daytime paper.
- **Do** honour reduced motion: the ink stroke, stamp and postcard transitions all switch off.

### Don't:
- **Don't** draw streets, pins, building footprints or anything that could locate a person; the map is cells and names only.
- **Don't** introduce a fifth plan ink, or spread lime beyond its roles: the main action, «yours», the current place in the bar, focus on forest and Brisa's IA seal.
- **Don't** set text that a person must read to act below 15px; the seal's 10–11px lettering, the 13px desktop map labels and the 13px phone bar labels are known defects, not a scale to reuse.
- **Don't** set action labels (pills, links, the bar) or the when, where and who lines in Fraunces.
- **Don't** use hard offset shadows or black shadows on paper; lift with ink-tinted, negative-spread shadows.
- **Don't** put a translucent, blurred bar on daytime paper.
