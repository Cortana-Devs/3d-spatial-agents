#set page(
  paper: "a4",
  margin: (x: 2cm, y: 1.8cm),
)
#set text(font: "Times New Roman", size: 11pt)
#set par(justify: true)

// --- Helpers ---
#let accent = rgb("#1a56db")
#let green = rgb("#166534")
#let yellow = rgb("#a16207")
#let grey = rgb("#6b7280")
#let light-bg = rgb("#f3f4f6")
#let border-c = rgb("#d1d5db")

#let badge(lbl, color) = box(
  fill: color,
  inset: (x: 5pt, y: 2pt),
  radius: 3pt,
)[#text(fill: white, size: 8pt, weight: "bold")[#lbl]]

#let section-heading(title) = [
  #v(8pt)
  #text(weight: "bold", size: 12pt, fill: accent)[#title]
  #v(2pt)
  #line(length: 100%, stroke: 0.5pt + border-c)
  #v(4pt)
]

// ===== UNIVERSITY HEADER =====
#align(center)[
  #text(size: 13pt, weight: "bold")[UNIVERSITY OF SRI JAYAWARDENAPURA]
  #v(1pt)
  #text(size: 11pt)[Faculty of Technology]
  #v(1pt)
  #text(size: 10pt)[Department of Information and Communication Technology]
  #v(12pt)
  #text(size: 16pt, weight: "bold", fill: accent)[Progress Report]
  #v(2pt)
  #text(size: 13pt, weight: "bold")[Web-Native 3D Virtual Office Assistant]
  #v(8pt)
  #text(
    size: 10pt,
    fill: grey,
  )[Group 08 | Dewmini L.G.N. (ICT/21/826) | Walimuni W.D.H.D. (ICT/21/938) | Thilakarathna G.S.D.P. (ICT/21/931)]
  #v(2pt)
  #text(size: 9pt, fill: grey)[Date: #datetime.today().display()]
]
#v(6pt)
#line(length: 100%, stroke: 1.5pt + accent)
#v(6pt)

// ===== ROW 1: Hero Screenshots =====
#section-heading("System Overview")

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
    #image("screencapture-localhost-3000-2026-02-13-03_51_29.png", width: 100%)
  ],
  block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
    #image("screencapture-localhost-3000-2026-02-13-03_52_21.png", width: 100%)
  ],
  block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
    #image("screencapture-localhost-3000-2026-02-13-03_54_58.png", width: 100%)
  ],
)
#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  [#align(center)[#text(size: 8pt, fill: grey)[Fig 1: 3D Office Lobby with AI Agents]]],
  [#align(center)[#text(size: 8pt, fill: grey)[Fig 2: AI Inspector Panel]]],
  [#align(center)[#text(size: 8pt, fill: grey)[Fig 3: Meeting Room Environment]]],
)

#v(8pt)

// ===== ROW 2: Objective + Progress alongside more screenshots =====
#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,

  // LEFT
  block(fill: light-bg, inset: 12pt, radius: 4pt, stroke: 0.5pt + border-c)[
    #section-heading("Main Objective")
    #text(
      size: 10pt,
    )[To design, implement, and evaluate a web-native 3D virtual office assistant system that integrates spatial intelligence capabilities with LLM-powered virtual agents, enabling intelligent spatial reasoning and natural language interaction within immersive virtual office environments.]

    #section-heading("Implementation Progress")
    #badge("DONE", green) 3D Core Scene and Environment \
    #badge("DONE", green) AI Navigation (Yuka + Steering) \
    #badge("DONE", green) Minimap System \
    #badge("DONE", green) Follow Mechanic (Press E) \
    #badge("DONE", green) AI Inspector Mode \
    #badge("DONE", green) Spatial Interaction Grid \
    #badge("WIP", yellow) LLM Brain Integration \
    #badge("PLAN", grey) Task Automation
  ],

  // RIGHT
  block(fill: light-bg, inset: 12pt, radius: 4pt, stroke: 0.5pt + border-c)[
    #grid(
      columns: (1fr, 1fr),
      gutter: 6pt,
      block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
        #image("screencapture-localhost-3000-2026-02-13-03_51_54.png", width: 100%)
      ],
      block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
        #image("screencapture-localhost-3000-2026-02-13-03_52_47.png", width: 100%)
      ],
    )
    #grid(
      columns: (1fr, 1fr),
      gutter: 6pt,
      [#align(center)[#text(size: 8pt, fill: grey)[Fig 4: Minimap (Live Tracking)]]],
      [#align(center)[#text(size: 8pt, fill: grey)[Fig 5: Spatial Interaction Grid]]],
    )

    #v(6pt)

    #section-heading("Technology Stack")
    #table(
      columns: (auto, 1fr),
      inset: 6pt,
      stroke: 0.5pt + border-c,
      align: (left, left),
      [*Component*], [*Technologies*],
      [Frontend], [Next.js, React Three Fiber],
      [AI Engine], [Yuka AI, Gemini LLM],
      [State], [Zustand],
      [3D Rendering], [Three.js, WebGL 2.0],
    )
  ],
)

#v(8pt)

// ===== ROW 3: Debug View + Key Features =====
#grid(
  columns: (1.2fr, 1fr),
  gutter: 10pt,

  block(fill: light-bg, inset: 12pt, radius: 4pt, stroke: 0.5pt + border-c)[
    #block(clip: true, radius: 4pt, stroke: 0.5pt + border-c)[
      #image("screencapture-localhost-3000-2026-02-13-03_54_01.png", width: 100%)
    ]
    #align(center)[#text(size: 8pt, fill: grey)[Fig 6: Wireframe Debug View -- Spatial Collision Bounds]]
  ],

  block(fill: light-bg, inset: 12pt, radius: 4pt, stroke: 0.5pt + border-c)[
    #section-heading("Key Achievements")
    #pad(left: 5pt)[
      - *Spatial Follow:* Agents navigate to player on command
      - *Gait Sync:* Distance-based walk cycle
      - *Head Tracking:* Proximity-aware agent gaze
      - *Multi-Ray Collision:* Smooth wall-sliding physics
      - *Glassmorphic UI:* Modern floating menu system
    ]

    #section-heading("Next Steps")
    #pad(left: 5pt)[
      + Connect live LLM API (Gemini)
      + Spatial task commands via NLP
      + Resource pick and place interactions
    ]
  ],
)
