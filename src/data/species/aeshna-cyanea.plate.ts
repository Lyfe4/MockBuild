import type { SpeciesPlate } from '@/lib/plate';

/**
 * *Aeshna cyanea*, dorsal — the southern hawker.
 *
 * Traced from the left-hand figure of plate XVII of William John Lucas's
 * *British Dragonflies* (1900). `references/SOURCES.md` has the provenance and
 * `references/aeshna-cyanea.jpg` is the file.
 *
 * ## One side of the wings and the other side of the legs
 *
 * Lucas draws each specimen with its wings spread to one side and its legs
 * splayed to the other, so the two do not overlap on the page. The animal has
 * both on both sides, so the plate takes the wings off the figure's left and
 * the legs off its right and folds each across the midline on the way in. The
 * builder's `wing()` and `limb()` are that fold, and it is the reason the
 * measurements below run in two directions.
 *
 * ## What the drawing has to get right
 *
 * The wings, and specifically that they are **windows**. Both declare
 * `opacity: 'membrane'`: four of them overlap each other, the legs and the
 * abdomen, and painted solid they hide the animal behind itself. This is the
 * one place in the project where a fill is composited at an opacity rather than
 * mixed into the paper.
 *
 * The venation is the second thing, and the place to be disciplined. Lucas
 * draws several hundred cells a wing. Nine strokes are drawn here — five
 * longitudinal and four cross — because at plate size the full reticulation is
 * a grey wash, and a grey wash is not an engraving. The pterostigma stays,
 * because it is a character rather than texture.
 *
 * Then the proportions: the abdomen is two-thirds of the animal, the thorax is
 * a squat box, and the eyes meet in a seam along the top of the head. Those
 * eyes are `compound-eye` rather than `eye` for the same reason the schema
 * has the id at all — on an aeshnid they are the identification.
 *
 * ## Plate space
 *
 * Midline at x = 0, y = 0 at the front of the head and y = 1000 at the tip of
 * the abdomen, before the claspers. The wings run out past x = 700.
 */
export const AESHNA_CYANEA_PLATE: SpeciesPlate = {
  species: 'aeshna-cyanea',
  order: 'odonata',
  sex: 'male',
  hallmark: 'four clear net-veined wings and a long spotted abdomen',
  reference: {
    title: 'British Dragonflies (Odonata), plate XVII',
    artist: 'William John Lucas',
    year: 1900,
    source:
      'https://commons.wikimedia.org/wiki/File:British_dragonflies_(Plate_XVII)_(6002339478).jpg',
    licence: 'Public domain (PD-old-100-expired)',
  },
  parts: [
    {
      id: 'hindleg-femur',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M55.67 249.95 C63.56 260.74 93.32 288.22 109.61 304.47 C125.91 320.72 154.22 350.27 164.32 358.28 C174.41 366.29 174.87 359.84 176.9 357.9 C178.93 355.96 185.4 355.78 177.84 345.34 C170.29 334.9 142.03 305.3 126.53 288.3 C111.02 271.29 84.89 240.34 74.45 231.97 C64.02 223.61 59.79 229.81 56.97 232.5 C54.15 235.2 47.77 239.15 55.67 249.95 Z',
    },
    {
      id: 'hindleg-tibia',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M163.49 354.34 C164.25 360.04 170.68 374.43 173.89 383 C177.1 391.57 182.18 406.73 184.9 411.46 C187.61 416.2 190.36 415.1 192 414.56 C193.64 414.01 196.49 413.23 195.82 407.82 C195.16 402.4 190.12 387.23 187.55 378.45 C184.98 369.67 181.48 354.3 178.67 349.28 C175.86 344.26 171.08 344.22 168.8 344.98 C166.53 345.74 162.73 348.64 163.49 354.34 Z',
    },
    {
      id: 'hindleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M184.15 411.19 C184.18 414.76 187.65 422.86 189.14 427.87 C190.64 432.87 192.53 441.58 194.14 444.54 C195.74 447.49 198.45 447.92 199.84 447.57 C201.24 447.22 203.43 445.57 203.45 442.21 C203.48 438.85 201.04 430.27 200.01 425.15 C198.98 420.03 198.23 411.25 196.57 408.09 C194.91 404.92 190.83 403.59 188.96 404.05 C187.1 404.52 184.12 407.62 184.15 411.19 Z',
    },
    {
      id: 'hindleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M193.36 444.73 C193.48 448.17 196.86 456.4 198.36 461.41 C199.85 466.41 201.89 475.2 203.35 478.08 C204.81 480.96 206.94 480.89 208.1 480.6 C209.27 480.31 211.18 479.37 211.11 476.14 C211.05 472.91 208.7 464.2 207.67 459.08 C206.64 453.96 205.74 445.11 204.23 442.02 C202.71 438.93 199.2 438.08 197.57 438.49 C195.94 438.89 193.24 441.3 193.36 444.73 Z',
    },
    {
      id: 'hindleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M207.23 477.11 C201.15 483.36 196.78 490.65 193.99 499.18',
    },
    {
      id: 'hindleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M207.23 477.11 C215.54 479.76 222.83 484.13 229.3 490.35',
    },
    {
      id: 'hindleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M177.83 372.05 C183.92 365.38 189.2 358.12 193.83 350.05',
    },
    {
      id: 'hindleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M184.19 391.13 C190.28 384.46 195.56 377.2 200.19 369.13',
    },
    {
      id: 'midleg-femur',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M65.67 176.64 C75.54 171.38 99.8 149.89 114.29 138.25 C128.78 126.61 154.92 106.8 162.27 99.04 C169.63 91.27 165.04 88.73 163.35 86.49 C161.66 84.25 160.46 79.14 150.99 84.1 C141.51 89.07 115.32 108.82 100.17 119.59 C85.02 130.36 57.74 147.84 49.99 155.9 C42.24 163.96 46.15 170.22 48.5 173.33 C50.85 176.44 55.8 181.9 65.67 176.64 Z',
    },
    {
      id: 'midleg-tibia',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M160.42 98.61 C164.24 97.79 171.17 92.3 175.7 89.47 C180.24 86.65 188.16 82.36 190.68 79.77 C193.2 77.19 193.33 73.76 192.51 72.24 C191.69 70.72 188.76 68.95 185.22 69.63 C181.67 70.31 173.73 74.56 168.88 76.8 C164.02 79.03 155.62 81.8 152.84 84.53 C150.05 87.25 149.15 92.87 150.29 94.98 C151.43 97.1 156.61 99.44 160.42 98.61 Z',
    },
    {
      id: 'midleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M191.39 80.1 C193.56 79.71 195.72 76.67 197.58 75.21 C199.44 73.74 202.69 72 203.78 70.31 C204.87 68.63 205.62 65.16 204.85 63.95 C204.08 62.73 200.62 61.94 198.63 62.22 C196.64 62.49 193.69 64.7 191.57 65.76 C189.45 66.82 185.79 67.5 184.51 69.3 C183.24 71.11 182.06 76.17 183.09 77.79 C184.12 79.41 189.21 80.49 191.39 80.1 Z',
    },
    {
      id: 'midleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M204.21 70.99 C206.23 70.56 208.55 67.56 210.41 66.1 C212.27 64.63 215.54 62.73 216.61 61.2 C217.67 59.67 218.14 56.91 217.5 55.9 C216.85 54.88 214.15 54.14 212.31 54.46 C210.48 54.77 207.37 56.94 205.26 58 C203.14 59.06 199.44 59.89 198.2 61.54 C196.95 63.19 196.05 67.55 196.95 68.97 C197.85 70.39 202.19 71.42 204.21 70.99 Z',
    },
    {
      id: 'midleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M214.46 57.83 C222.32 61.62 230.61 63.47 239.59 63.41',
    },
    {
      id: 'midleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M214.46 57.83 C214.35 49.1 216.19 40.81 220.04 32.7',
    },
    {
      id: 'midleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M167.59 85.67 C173.68 78.99 178.96 71.73 183.59 63.67',
    },
    {
      id: 'midleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M177.93 80.1 C184.02 73.43 189.3 66.17 193.93 58.1',
    },
    {
      id: 'foreleg-femur',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M59.92 130.91 C66.23 121.77 77.79 91.79 85.25 74.93 C92.71 58.07 106.71 28.71 109.64 18.5 C112.58 8.29 107.37 8.07 104.83 6.86 C102.3 5.65 98.86 1.73 92.76 10.42 C86.65 19.12 72.58 48.44 64.14 64.83 C55.7 81.22 39.61 109.04 36.46 119.69 C33.31 130.34 39.62 134.17 43.14 135.85 C46.66 137.54 53.6 140.05 59.92 130.91 Z',
    },
    {
      id: 'foreleg-tibia',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M108.94 16.5 C111.16 12.29 112.71 0.35 114.19 -6.6 C115.67 -13.56 118.76 -25.4 118.82 -29.86 C118.88 -34.33 116.24 -35.9 114.57 -36.34 C112.9 -36.78 109.83 -36.71 107.68 -32.8 C105.53 -28.88 102.39 -17.05 100.26 -10.27 C98.13 -3.48 93.6 7.67 93.46 12.42 C93.33 17.18 97.05 20.81 99.37 21.42 C101.69 22.03 106.71 20.7 108.94 16.5 Z',
    },
    {
      id: 'foreleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M119.24 -29.08 C120.87 -31.04 121.25 -36.03 122.11 -39 C122.97 -41.98 124.99 -46.57 124.97 -48.92 C124.96 -51.27 123.35 -54.14 122 -54.65 C120.65 -55.16 117.54 -54.05 115.99 -52.29 C114.43 -50.53 112.93 -45.74 111.62 -42.93 C110.31 -40.13 107.32 -36.13 107.26 -33.58 C107.2 -31.03 109.43 -26.61 111.23 -25.94 C113.02 -25.26 117.61 -27.12 119.24 -29.08 Z',
    },
    {
      id: 'foreleg-tarsus',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M125.72 -48.64 C127.21 -50.54 127.73 -55.58 128.59 -58.56 C129.45 -61.53 131.4 -66.27 131.46 -68.48 C131.51 -70.68 130.1 -72.83 128.97 -73.25 C127.85 -73.67 125.37 -72.98 123.96 -71.28 C122.56 -69.59 120.91 -64.74 119.6 -61.93 C118.29 -59.12 115.37 -54.98 115.24 -52.57 C115.1 -50.17 117.14 -46.48 118.71 -45.89 C120.28 -45.3 124.24 -46.74 125.72 -48.64 Z',
    },
    {
      id: 'foreleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M127.71 -69.88 C136.27 -71.57 144 -75.09 151.14 -80.53',
    },
    {
      id: 'foreleg-tarsus',
      rank: 'detail',
      fill: 'none',
      d: 'M127.71 -69.88 C122.38 -76.79 118.86 -84.52 117.06 -93.31',
    },
    {
      id: 'foreleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M105.42 -1.57 C111.51 -8.24 116.79 -15.5 121.42 -23.57',
    },
    {
      id: 'foreleg-tibia',
      rank: 'detail',
      fill: 'none',
      d: 'M109.39 -16.68 C115.48 -23.35 120.76 -30.61 125.39 -38.68',
    },
    {
      id: 'hindwing',
      rank: 'structure',
      fill: 'pigment',
      d: 'M89.16 248.19 C110.36 237.91 200.32 237.75 243.37 236.14 C286.42 234.53 367.07 235.5 412.05 236.14 C457.03 236.78 543.13 238.71 580.72 240.96 C618.31 243.21 674.7 248.83 693.98 253.01 C713.26 257.19 727.23 262.01 725.3 272.29 C723.37 282.57 703.62 314.7 679.52 330.12 C655.42 345.54 583.46 374.46 544.58 387.95 C505.7 401.44 426.5 422.98 387.95 431.33 C349.4 439.68 287.23 448.67 255.42 450.6 C223.61 452.53 171.25 451.88 149.4 445.78 C127.55 439.68 100.24 422.49 91.57 404.82 C82.9 387.15 84.66 334.13 84.34 313.25 C84.02 292.37 67.96 258.47 89.16 248.19 Z',
      opacity: 'membrane',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M110.96 259.67 C149.47 258.91 248 254.76 342 255.14 C436 255.51 619.47 260.8 674.96 261.93',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M110.96 275.53 C149.47 275.9 251.39 277.41 342 277.79 C432.6 278.17 602.48 277.79 654.57 277.79',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M110.96 295.91 C150.98 297.42 264.99 304.97 351.06 304.97 C437.13 304.97 581.33 297.42 627.39 295.91',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M113.23 320.82 C154 324.22 278.58 340.08 357.85 341.21 C437.13 342.35 550.38 329.89 588.89 327.62',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M117.75 348.01 C158.52 353.29 294.05 377.07 362.38 379.72 C430.71 382.36 500.17 366.51 527.73 363.87',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M124.55 372.92 C159.65 378.96 282.35 403.88 335.2 409.17 C388.05 414.45 423.91 405.39 441.65 404.63',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M579.83 248.34 C580.96 256.27 584.36 280.06 586.62 295.91 C588.89 311.77 592.29 335.55 593.42 343.48',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M489.23 246.08 C490.74 255.51 494.88 280.05 498.28 302.7 C501.68 325.35 507.72 368.77 509.61 381.98',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M387.29 246.08 C389.56 257.78 395.98 288.73 400.89 316.29 C405.8 343.85 414.1 395.57 416.74 411.43',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M285.37 246.08 C287.64 258.53 294.06 290.25 298.96 320.82 C303.87 351.4 312.17 411.42 314.81 429.54',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M194.76 250.61 C197.03 263.06 203.83 294.4 208.36 325.36 C212.89 356.31 219.68 417.84 221.95 436.34',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M637.16 262.33 C636.73 268.39 622.99 272.37 606.46 271.21 C589.93 270.06 576.88 264.21 577.3 258.15 C577.73 252.09 591.47 248.11 608 249.27 C624.53 250.42 637.58 256.27 637.16 262.33 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'forewing',
      rank: 'structure',
      fill: 'pigment',
      d: 'M79.52 118.07 C96.87 101.36 178.16 91.57 219.28 81.93 C260.4 72.29 344.58 54.78 387.95 45.78 C431.32 36.78 507.95 20.89 544.58 14.46 C581.21 8.03 639.84 -1.45 662.65 -2.41 C685.46 -3.37 713.09 -1.44 715.66 7.23 C718.23 15.9 703.13 48.51 681.93 62.65 C660.73 76.79 595.83 99.11 556.63 113.25 C517.43 127.39 429.72 155.82 387.95 168.67 C346.18 181.52 277.43 201.29 243.37 209.64 C209.31 217.99 153.09 231.65 132.53 231.33 C111.97 231.01 96.23 222.33 89.16 207.23 C82.09 192.13 62.17 134.78 79.52 118.07 Z',
      opacity: 'membrane',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M104.86 124.08 C152.05 113.13 293.61 77.27 387.99 58.39 C482.36 39.52 623.93 18.76 671.12 10.83',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M104.86 137.67 C152.05 127.86 295.87 97.66 387.99 78.78 C480.1 59.91 612.61 33.48 657.53 24.42',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M104.86 153.53 C152.05 145.22 300.4 121.06 387.99 103.69 C475.57 86.32 589.95 58.39 630.35 49.33',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M107.12 171.64 C153.93 164.47 307.95 143.71 387.99 128.61 C468.02 113.51 554.09 88.97 587.31 81.05',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M109.39 189.77 C154.69 184.1 313.24 167.5 381.19 155.79 C449.14 144.09 494.44 125.59 517.09 119.55',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M580.52 15.36 C581.27 21.78 583.54 41.78 585.05 53.86 C586.56 65.94 588.82 82.18 589.58 87.84',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M489.92 28.95 C491.05 36.12 494.44 57.64 496.71 71.98 C498.97 86.33 502.37 107.85 503.5 115.02',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M387.99 51.6 C389.5 60.66 394.17 88.3 397.05 105.96 C399.92 123.62 403.87 148.96 405.23 157.56',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M291.19 71.48 C291.84 80.25 292.96 105.12 295.12 124.08 C297.29 143.04 302.67 175.04 304.18 185.24',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M195.46 92.37 C196.97 101.81 201.87 128.99 204.52 149 C207.16 169.01 210.18 201.85 211.31 212.42',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M614.72 16.51 C615.29 21.95 603.73 27.62 588.9 29.18 C574.07 30.74 561.58 27.59 561.01 22.16 C560.44 16.72 572 11.05 586.83 9.49 C601.66 7.93 614.14 11.07 614.72 16.51 Z',
      clipTo: 'forewing',
    },
    {
      id: 'abdomen',
      rank: 'outline',
      fill: 'pigment',
      d: 'M-35 277.11 C-40.85 289.43 -40.95 309.64 -39 327.71 C-37.05 345.78 -25 363.61 -22 397.59 C-19 431.57 -19.3 501.81 -19 554.22 C-18.7 606.63 -19.4 692.77 -20 746.99 C-20.6 801.21 -23.45 877.71 -23 915.66 C-22.55 953.61 -20.45 985.05 -17 1000 C-13.55 1014.95 -5.1 1015.3 0 1015.3 C5.1 1015.3 13.55 1014.95 17 1000 C20.45 985.05 22.55 953.61 23 915.66 C23.45 877.71 20.6 801.21 20 746.99 C19.4 692.77 18.7 606.63 19 554.22 C19.3 501.81 19 431.57 22 397.59 C25 363.61 37.05 345.78 39 327.71 C40.95 309.64 40.85 289.43 35 277.11 C29.15 264.8 10.5 245.61 0 245.61 C-10.5 245.61 -29.15 264.8 -35 277.11 Z',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-27.75 327.71 C-9.43 332.71 8.88 332.71 27.75 327.71',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-29.78 390.36 C-10.13 395.36 9.53 395.36 29.78 390.36',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-31.77 462.65 C-10.8 467.65 10.17 467.65 31.77 462.65',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-33.24 537.35 C-11.3 542.35 10.64 542.35 33.24 537.35',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-33.94 609.64 C-11.54 614.64 10.86 614.64 33.94 609.64',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-33.87 679.52 C-11.52 684.52 10.84 684.52 33.87 679.52',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-33.09 749.4 C-11.25 754.4 10.59 754.4 33.09 749.4',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-31.66 819.28 C-10.76 824.28 10.13 824.28 31.66 819.28',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-29.71 889.16 C-10.1 894.16 9.51 894.16 29.71 889.16',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-27.83 946.99 C-9.46 951.99 8.9 951.99 27.83 946.99',
      mirror: false,
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 416.87 C22.25 425.15 18.22 431.87 13.25 431.87 C8.28 431.87 4.25 425.15 4.25 416.87 C4.25 408.59 8.28 401.87 13.25 401.87 C18.22 401.87 22.25 408.59 22.25 416.87 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 491.57 C22.25 499.85 18.22 506.57 13.25 506.57 C8.28 506.57 4.25 499.85 4.25 491.57 C4.25 483.29 8.28 476.57 13.25 476.57 C18.22 476.57 22.25 483.29 22.25 491.57 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 563.86 C22.25 572.14 18.22 578.86 13.25 578.86 C8.28 578.86 4.25 572.14 4.25 563.86 C4.25 555.58 8.28 548.86 13.25 548.86 C18.22 548.86 22.25 555.58 22.25 563.86 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 636.14 C22.25 644.42 18.22 651.14 13.25 651.14 C8.28 651.14 4.25 644.42 4.25 636.14 C4.25 627.86 8.28 621.14 13.25 621.14 C18.22 621.14 22.25 627.86 22.25 636.14 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 706.02 C22.25 714.3 18.22 721.02 13.25 721.02 C8.28 721.02 4.25 714.3 4.25 706.02 C4.25 697.74 8.28 691.02 13.25 691.02 C18.22 691.02 22.25 697.74 22.25 706.02 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 775.9 C22.25 784.18 18.22 790.9 13.25 790.9 C8.28 790.9 4.25 784.18 4.25 775.9 C4.25 767.62 8.28 760.9 13.25 760.9 C18.22 760.9 22.25 767.62 22.25 775.9 Z',
    },
    {
      id: 'marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M22.25 845.78 C22.25 854.06 18.22 860.78 13.25 860.78 C8.28 860.78 4.25 854.06 4.25 845.78 C4.25 837.5 8.28 830.78 13.25 830.78 C18.22 830.78 22.25 837.5 22.25 845.78 Z',
    },
    {
      id: 'cercus',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M4.67 998.93 C4.62 1004.08 8.59 1017.39 10.47 1025.26 C12.36 1033.13 15.47 1047.01 17.26 1051.41 C19.05 1055.8 21.09 1054.83 22.41 1054.58 C23.74 1054.34 25.99 1054.54 26.12 1049.79 C26.24 1045.05 24.27 1030.96 23.27 1022.93 C22.26 1014.9 21.29 1001.05 19.43 996.25 C17.57 991.45 13.06 990.55 10.84 990.95 C8.63 991.35 4.73 993.79 4.67 998.93 Z',
    },
    {
      id: 'thorax',
      rank: 'outline',
      fill: 'pigment-deep',
      d: 'M0 103.61 C15.7 103.61 45.52 106.44 55.42 115.66 C65.32 124.88 69.2 151.6 69.88 168.67 C70.56 185.74 65.02 220.44 60.24 236.14 C55.46 251.84 44.67 273.37 36.14 279.52 C27.61 285.67 10.24 279.52 0 279.52 C-10.24 279.52 -27.61 285.67 -36.14 279.52 C-44.67 273.37 -55.46 251.84 -60.24 236.14 C-65.02 220.44 -70.56 185.74 -69.88 168.67 C-69.2 151.6 -65.32 124.88 -55.42 115.66 C-45.52 106.44 -15.7 103.61 0 103.61 Z',
      mirror: false,
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M13.59 127.35 C12.84 134.52 9.82 155.65 9.06 170.38 C8.31 185.1 9.06 208.13 9.06 215.69',
      clipTo: 'thorax',
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M29.45 129.61 C30.2 136.78 32.84 157.54 33.97 172.64 C35.1 187.74 35.86 212.29 36.24 220.22',
      clipTo: 'thorax',
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M45.3 140.94 C46.05 146.98 49.45 165.09 49.83 177.17 C50.21 189.26 47.94 207.38 47.56 213.42',
      clipTo: 'thorax',
    },
    {
      id: 'head',
      rank: 'outline',
      fill: 'pigment-deep',
      d: 'M0 2.41 C11.61 2.41 31.4 3.15 40.96 9.64 C50.52 16.13 64.4 35.22 67.47 48.19 C70.54 61.16 68.11 91.64 62.65 101.2 C57.19 110.76 37.8 113.61 28.92 115.66 C20.04 117.71 8.19 115.66 0 115.66 C-8.19 115.66 -20.04 117.71 -28.92 115.66 C-37.8 113.61 -57.19 110.76 -62.65 101.2 C-68.11 91.64 -70.54 61.16 -67.47 48.19 C-64.4 35.22 -50.52 16.13 -40.96 9.64 C-31.4 3.15 -11.61 2.41 0 2.41 Z',
      mirror: false,
    },
    {
      id: 'compound-eye',
      rank: 'structure',
      fill: 'pigment',
      d: 'M84.91 51.92 C89.27 72.45 75.29 92.82 53.68 97.41 C32.07 102 11.02 89.08 6.65 68.56 C2.29 48.03 16.27 27.66 37.88 23.07 C59.49 18.48 80.54 31.4 84.91 51.92 Z',
    },
    {
      id: 'ocellus',
      rank: 'detail',
      fill: 'ink',
      d: 'M7 21.69 C7 25.56 3.87 28.69 0 28.69 C-3.87 28.69 -7 25.56 -7 21.69 C-7 17.82 -3.87 14.69 0 14.69 C3.87 14.69 7 17.82 7 21.69 Z',
      mirror: false,
    },
    {
      id: 'ocellus',
      rank: 'detail',
      fill: 'ink',
      d: 'M27.69 19.28 C27.69 22.59 25 25.28 21.69 25.28 C18.38 25.28 15.69 22.59 15.69 19.28 C15.69 15.97 18.38 13.28 21.69 13.28 C25 13.28 27.69 15.97 27.69 19.28 Z',
    },
    {
      id: 'antenna',
      rank: 'detail',
      fill: 'none',
      d: 'M28.92 12.05 C38.93 6.44 47.68 -0.72 55.42 -9.64',
    },
  ],
};
