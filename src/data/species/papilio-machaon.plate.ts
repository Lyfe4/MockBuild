import type { SpeciesPlate } from '@/lib/plate';

/**
 * *Papilio machaon*, dorsal, wings spread — the Old World swallowtail.
 *
 * Traced from Jacob Hübner's plate, reproduced in *Das kleine
 * Schmetterlingsbuch*; `references/SOURCES.md` has the provenance and
 * `references/papilio-machaon.jpg` is the file. The figure shows the upperside
 * on the left and the underside on the right; only the upperside is traced.
 *
 * ## What the drawing has to get right
 *
 * The wing shape, which is what a swallowtail is recognised by before any of
 * the pattern resolves: a long-triangular forewing with the apex thrown well
 * forward of the costa's midpoint, and a hindwing whose margin is scalloped and
 * drawn out into the tail. Get the tail wrong and it is a different family.
 *
 * Then the pattern, and only as much of it as three line weights can carry. The
 * lithograph has a stippled yellow ground, a black border with pale lunules, a
 * row of blue lunules on the hindwing and one orange ocellus at the inner
 * corner. The stipple is left behind — this is an engraving — but the border,
 * the lunules and the ocellus stay, because those are what a key would ask for.
 *
 * ## What the first pass got wrong
 *
 * The tail, and the shading at the front of the forewing, both measured off the
 * reference the second time round.
 *
 * The tail reached 0.47 of a body length below the abdomen tip where the
 * reference gives 0.54, and it was half again too wide, so it read as a torn
 * corner rather than as the thing the family is named for. It is now longer,
 * narrower, and inked to the tip — the reference draws it solid, not pale with
 * an outline round it.
 *
 * The shading was a rounded patch at the *trailing* corner of the wing base:
 * the wrong edge of the wing, and a smudge rather than a character. The
 * lithograph darkens the costal third, from the base out to where the apical
 * border takes over, and that is what is drawn now.
 *
 * ## No legs
 *
 * A machaon with its wings spread shows none from above, so none are drawn, and
 * `REQUIRED_PARTS.lepidoptera` does not ask for them. Drawing legs that the
 * reference does not contain would be inventing the animal rather than tracing
 * it.
 *
 * ## Plate space
 *
 * Midline at x = 0, y = 0 at the front of the head and y = 1000 at the tip of
 * the abdomen. The wings run out past x = 1500 and above y = -300, which is the
 * whole point of measuring the frame from the drawing: a swallowtail's body is
 * about a tenth of its wingspan.
 */
export const PAPILIO_MACHAON_PLATE: SpeciesPlate = {
  species: 'papilio-machaon',
  order: 'lepidoptera',
  sex: 'unsexed',
  hallmark: 'tailed hindwings with a blue band and one orange eyespot',
  reference: {
    title: 'Schwalbenschwanz, from Das kleine Schmetterlingsbuch: Die Tagfalter',
    artist: 'Jacob Hübner',
    // Undated on the source page. Hübner died in 1826, which is both what the
    // public-domain claim rests on and the latest the drawing can be; the
    // Papilionidae plates of his *Sammlung europäischer Schmetterlinge* were
    // issued a good deal earlier. See references/SOURCES.md.
    year: 1826,
    source: 'https://commons.wikimedia.org/wiki/File:Papilio_machaon_Schwalbenschwanz.jpg',
    licence: 'Public domain (PD-Art, PD-old-auto-1923)',
  },
  parts: [
    {
      id: 'hindwing',
      rank: 'outline',
      fill: 'pigment',
      d: 'M89.55 391.04 C129.3 359.75 284.63 408.21 358.21 420.9 C431.79 433.59 548.91 461.99 608.96 480.6 C669.01 499.21 742.34 526.87 782.09 552.24 C821.84 577.61 869.25 628.41 889.55 659.7 C909.85 690.99 925.37 743.53 925.37 773.13 C925.37 802.73 899.7 842.44 889.55 868.66 C879.4 894.88 866.42 934.53 853.73 958.21 C841.04 981.89 810.99 1012.98 800 1035.82 C789.01 1058.66 782.89 1087.26 776.12 1119.4 C769.35 1151.54 762.39 1210.25 752.24 1262.69 C751.37 1274.24 749.37 1305.78 747 1332 C744.63 1358.22 740.83 1392.33 738 1420 C735.17 1447.67 732 1474.82 730 1498 C728 1521.18 729 1547.56 726 1559.07 C723 1570.58 716.17 1577.08 712 1567.07 C707.83 1557.06 704.5 1523.68 701 1499 C697.5 1474.32 694.67 1446.17 691 1419 C687.33 1391.83 684.71 1354.09 679 1336 C673.29 1317.91 660.43 1314.71 656.72 1310.45 C645.73 1270.7 640.4 1216.57 626.87 1208.96 C613.34 1201.35 579.8 1258.41 561.19 1256.72 C542.58 1255.03 515.82 1198.7 495.52 1197.01 C475.22 1195.32 439.05 1247.32 417.91 1244.78 C396.77 1242.24 367.41 1185.87 346.27 1179.1 C325.13 1172.33 288.11 1206.31 268.66 1197.01 C249.21 1187.71 225.88 1140.49 208.96 1113.43 C192.04 1086.37 164.47 1044.03 149.25 1005.97 C134.03 967.91 111.64 896.37 101.49 844.78 C91.34 793.19 79.3 706.07 77.61 641.79 C75.92 577.51 49.8 422.33 89.55 391.04 Z',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M172.34 520.75 C214.43 529.16 334.16 554.42 424.88 571.25 C515.61 588.09 668.07 613.34 716.71 621.76',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M166.73 610.53 C207.89 626.43 312.64 679.75 413.66 705.93 C514.67 732.12 712.96 757.38 772.82 767.66',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M161.12 700.32 C200.4 721.84 300.48 793.86 396.82 829.4 C493.16 864.95 682.1 899.55 739.15 913.58',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M155.51 790.11 C189.18 814.43 276.17 892.07 357.54 936.03 C438.92 979.99 596.05 1034.23 643.75 1053.88',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M149.89 874.3 C174.21 894.87 234.08 955.67 295.81 997.76 C357.54 1039.85 482.87 1105.32 520.28 1126.83',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M158.44 958.68 C169.18 973.61 187.8 1017.43 222.86 1048.26 C257.91 1079.09 344.45 1127.76 368.76 1143.66',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M127.45 717.16 C144.28 749.9 193.86 848.11 228.47 913.58 C263.08 979.05 317.32 1077.26 335.09 1109.99',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M768.6 574.57 C794.05 583.41 853.28 650.07 870.21 676.18 C887.15 702.29 904.09 758.74 904.09 783.44 C904.09 808.14 878.68 851.9 870.21 873.77 C861.75 895.65 846.93 938.69 836.34 958.45 C825.76 978.21 794.71 1012.79 785.54 1031.84 C776.36 1050.89 782.96 1089.19 762.96 1110.87 C742.95 1132.55 650.88 1189.03 625.48 1205.27 C600.07 1221.5 575.89 1242.19 559.72 1240.72 C543.54 1239.25 513.03 1194.91 496.1 1193.49 C479.16 1192.08 442.61 1231.64 424.23 1229.43 C405.86 1227.23 368.04 1180.35 349.09 1175.85 C330.14 1171.36 289.55 1201.58 272.64 1193.49 C255.74 1185.41 216.78 1132.48 213.84 1111.17 C210.9 1089.85 233.68 1029.58 249.12 1022.96 C264.56 1016.35 316.01 1046.48 337.33 1058.24 C358.64 1070 398.34 1115.58 419.65 1117.05 C440.97 1118.52 488.01 1070 507.86 1070 C527.71 1070 560.05 1118.52 578.43 1117.05 C596.8 1115.58 637.24 1078.09 654.88 1058.24 C672.52 1038.4 705.6 986.94 719.57 958.28 C733.53 929.61 762.93 860.52 766.61 828.91 C770.28 797.3 761.46 733.34 748.97 705.41 C736.47 677.47 664.19 621.79 666.64 605.44 C669.1 589.08 743.15 565.72 768.6 574.57 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M821.62 662.68 C835.55 666.15 842.51 686.34 837.17 707.78 C831.82 729.22 816.2 743.78 802.26 740.3 C788.33 736.83 781.37 716.64 786.71 695.2 C792.06 673.76 807.68 659.2 821.62 662.68 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M804.18 787.09 C818.46 788.59 828.17 807.62 825.86 829.59 C823.55 851.56 810.1 868.15 795.82 866.65 C781.54 865.15 771.83 846.12 774.14 824.15 C776.45 802.18 789.9 785.59 804.18 787.09 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M778.21 905.66 C790.65 912.84 791.77 934.17 780.73 953.3 C769.68 972.43 750.65 982.12 738.21 974.94 C725.77 967.76 724.65 946.43 735.69 927.3 C746.74 908.17 765.77 898.48 778.21 905.66 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M717.21 1010.11 C726.44 1021.11 720.21 1041.54 703.28 1055.74 C686.36 1069.94 665.16 1072.53 655.93 1061.53 C646.7 1050.53 652.93 1030.1 669.86 1015.9 C686.78 1001.7 707.98 999.11 717.21 1010.11 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M628.63 1111.69 C633.54 1125.18 620.69 1142.25 599.93 1149.8 C579.17 1157.36 558.36 1152.54 553.45 1139.05 C548.54 1125.56 561.39 1108.49 582.15 1100.94 C602.91 1093.38 623.72 1098.2 628.63 1111.69 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M517.39 1145.07 C518.89 1159.35 502.3 1172.8 480.33 1175.11 C458.36 1177.42 439.33 1167.71 437.83 1153.43 C436.33 1139.15 452.92 1125.7 474.89 1123.39 C496.86 1121.08 515.89 1130.79 517.39 1145.07 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'pigment',
      d: 'M409.54 1132.32 C407.05 1146.46 387.39 1154.81 365.64 1150.98 C343.88 1147.14 328.26 1132.57 330.76 1118.42 C333.25 1104.28 352.91 1095.93 374.66 1099.76 C396.42 1103.6 412.04 1118.17 409.54 1132.32 Z',
      clipTo: 'hindwing',
    },
    {
      // The tail itself, inked.
      //
      // The black marginal band stops at the anal angle, and the tail below it
      // is solid in the reference rather than pale with an outline round it.
      // Drawn as its own part rather than by extending the band, because the
      // band is a ring and the tail is not.
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M744 1254 C752.88 1264.38 740.63 1323.75 739 1345 C737.38 1366.25 732.88 1405 731 1424 C729.13 1443 725.38 1481.25 724 1497 C722.63 1512.75 721.63 1542.25 720 1550 C718.38 1557.75 713.25 1565.25 711 1559 C708.75 1552.75 704.13 1516.88 702 1500 C699.88 1483.13 696 1443.38 694 1424 C692 1404.63 689.25 1365.25 686 1345 C682.75 1324.75 660.75 1273.38 668 1262 C675.25 1250.63 735.13 1243.63 744 1254 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment',
      d: 'M360.51 1083.58 C360.51 1115.61 332.75 1141.58 298.51 1141.58 C264.27 1141.58 236.51 1115.61 236.51 1083.58 C236.51 1051.55 264.27 1025.58 298.51 1025.58 C332.75 1025.58 360.51 1051.55 360.51 1083.58 Z',
      clipTo: 'hindwing',
    },
    {
      id: 'forewing',
      rank: 'outline',
      fill: 'pigment',
      d: 'M83.58 92.54 C110.45 58.21 306.72 -35.82 394.03 -74.63 C481.34 -113.44 685.08 -188.06 782.09 -217.91 C879.11 -247.76 1088.06 -295.52 1170.15 -313.43 C1252.24 -331.34 1394.78 -355.97 1438.81 -361.19 C1482.84 -366.41 1517.91 -378.35 1522.39 -355.22 C1526.87 -332.09 1494.03 -221.64 1474.63 -176.12 C1455.23 -130.6 1398.5 -35.82 1367.16 8.96 C1335.82 53.74 1261.94 143.29 1223.88 182.09 C1185.82 220.9 1104.48 291.79 1062.69 319.4 C1020.9 347.01 943.28 392.54 889.55 402.99 C835.82 413.44 697.77 413.44 632.84 402.99 C567.92 392.54 426.87 344.77 370.15 319.4 C313.43 294.03 214.92 228.36 179.1 200 C143.28 171.64 56.71 126.87 83.58 92.54 Z',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M216.27 139.37 C288.29 111.31 488.46 28.06 648.4 -28.99 C808.34 -86.05 1088 -173.97 1175.92 -202.96',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M221.88 173.04 C294.84 154.33 492.2 101.02 659.62 60.8 C827.05 20.58 1131.96 -46.76 1226.42 -68.28',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M266.06 197.94 C330.72 188.18 497.69 159.42 654.01 139.37 C810.33 119.32 1112.31 87.93 1203.98 77.64',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M282.06 229.92 C340.31 228.86 492.87 226.48 631.56 223.55 C770.25 220.61 1033.75 214.19 1114.19 212.32',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M332.82 250.38 C376.06 258.07 481.68 286.01 592.27 296.5 C702.86 306.99 928.99 310.53 996.34 313.33',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M375.22 268.29 C402.04 281.41 462.56 329.21 536.15 347.01 C609.74 364.8 769.99 370.39 816.75 375.06',
      clipTo: 'forewing',
    },
    {
      id: 'wing-vein',
      rank: 'detail',
      fill: 'none',
      d: 'M193.82 122.53 C222.82 109.44 303.26 72.96 367.8 43.97 C432.34 14.97 545.51 -35.54 581.05 -51.44',
      clipTo: 'forewing',
    },
    {
      // The dark costal third, not a basal blob.
      //
      // The lithograph darkens the front third of the forewing from the wing
      // base out towards the apex, where it runs into the black border. An
      // earlier pass drew that as a rounded patch at the trailing corner of the
      // wing base — the wrong edge of the wing, and it read as a smudge rather
      // than as the costal shading a key would name. Measured off the
      // reference: the band hugs the costa, is at its deepest where the wing
      // meets the thorax, and thins to nothing where the apical border starts.
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M112 112 C123.11 101.56 182.44 57.22 212 40 C241.56 22.78 334.22 -23.67 378 -43 C421.78 -62.33 560.67 -117 606 -134 C651.33 -151 745.78 -183.78 786 -196 C826.22 -208.22 927.33 -233.89 968 -244 C1008.67 -254.11 1122 -280.22 1152 -287 C1182 -293.78 1219.56 -301.22 1238 -305 C1256.44 -308.78 1309.11 -321.67 1318 -321 C1326.89 -320.33 1326.89 -307.89 1318 -299 C1309.11 -290.11 1256.44 -252.78 1238 -241 C1219.56 -229.22 1182 -206.89 1152 -193 C1122 -179.11 1008.67 -130.11 968 -116 C927.33 -101.89 826.22 -78.22 786 -66 C745.78 -53.78 651.33 -21.56 606 -6 C560.67 9.56 421.78 59.33 378 74 C334.22 88.67 241.56 119.33 212 126 C182.44 132.67 123.11 135.56 112 134 C100.89 132.44 100.89 122.44 112 112 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M509.56 -92.23 C513.33 -59.01 547.83 37.92 560.07 92.59 C572.32 147.26 583.74 243.31 591.22 272.22 C598.7 301.14 604.88 285.98 609.94 285.37 C615 284.75 624.68 298.44 624.98 268.13 C625.28 237.82 619.58 139.63 611.95 83.3 C604.32 26.97 585.64 -75.59 574.1 -107.41 C562.56 -139.24 544.68 -131.14 535 -128.86 C525.32 -126.59 505.8 -125.45 509.56 -92.23 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M785.67 -190.21 C784.39 -155.76 806.25 -53.2 808.88 5.82 C811.51 64.84 801.74 171.18 803.22 203.26 C804.69 235.34 813.71 219.28 818.74 219.69 C823.76 220.1 830.02 238.06 836.71 205.97 C843.39 173.89 860.65 66.08 863.28 5.82 C865.91 -54.45 861.12 -161.32 854.25 -195.77 C847.37 -230.22 827.74 -224.69 817.46 -223.85 C807.17 -223.02 786.96 -224.66 785.67 -190.21 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M1038.48 -257.81 C1033.29 -227.67 1043.23 -137.52 1037.26 -84.06 C1031.29 -30.59 1002.81 68.67 998.7 98.64 C994.6 128.61 1005.49 114.59 1009.9 115.75 C1014.3 116.92 1016.64 135.22 1028.09 106.42 C1039.54 77.62 1075.1 -22.1 1086.25 -76.27 C1097.39 -130.43 1104.56 -223.35 1102.41 -254.66 C1100.25 -285.97 1081.45 -284.53 1071.86 -285 C1062.28 -285.48 1043.67 -287.96 1038.48 -257.81 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'structure',
      fill: 'pigment-deep',
      d: 'M1488.1 -334.2 C1502.41 -311.61 1462.51 -210.75 1442.94 -164.84 C1423.37 -118.92 1372.93 -34.99 1341.32 10.17 C1309.7 55.34 1244.22 134.74 1205.83 173.88 C1167.45 213.02 1095.56 275.87 1053.41 303.72 C1011.26 331.58 920.94 382.82 889.69 382.77 C858.44 382.71 807.28 325.67 819.02 303.32 C830.77 280.96 938.59 245.69 977.8 215.11 C1017 184.53 1080.12 113.18 1113.06 73.98 C1145.99 34.78 1199.69 -37.37 1224.78 -78.92 C1249.87 -120.48 1286.44 -203.66 1301.23 -237.69 C1316.02 -271.73 1310.76 -321.33 1335.67 -334.2 C1360.59 -347.06 1473.8 -356.78 1488.1 -334.2 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M1429.13 -298.66 C1440.91 -295.72 1446.79 -278.57 1442.25 -260.35 C1437.7 -242.13 1424.46 -229.74 1412.67 -232.68 C1400.89 -235.62 1395.01 -252.77 1399.55 -270.99 C1404.1 -289.21 1417.34 -301.6 1429.13 -298.66 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M1353.27 -146.44 C1364 -140.74 1365.55 -122.67 1356.73 -106.09 C1347.92 -89.51 1332.08 -80.7 1321.35 -86.4 C1310.62 -92.1 1309.07 -110.17 1317.89 -126.75 C1326.7 -143.33 1342.54 -152.14 1353.27 -146.44 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M1263.64 12.76 C1272.95 20.57 1270.71 38.57 1258.64 52.95 C1246.57 67.34 1229.24 72.67 1219.94 64.86 C1210.63 57.05 1212.87 39.05 1224.94 24.67 C1237.01 10.28 1254.34 4.95 1263.64 12.76 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M1154.41 160.24 C1162.22 169.54 1156.89 186.87 1142.5 198.94 C1128.12 211.01 1110.12 213.25 1102.31 203.94 C1094.5 194.64 1099.83 177.31 1114.22 165.24 C1128.6 153.17 1146.6 150.93 1154.41 160.24 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M1028.53 288.75 C1033.09 300.02 1022.66 314.85 1005.25 321.89 C987.84 328.92 970.04 325.49 965.49 314.23 C960.93 302.96 971.36 288.13 988.77 281.09 C1006.18 274.06 1023.98 277.49 1028.53 288.75 Z',
      clipTo: 'forewing',
    },
    {
      id: 'wing-marking',
      rank: 'detail',
      fill: 'surface',
      d: 'M905.31 356.46 C907 368.49 893.3 380.36 874.7 382.98 C856.11 385.59 839.66 377.95 837.97 365.92 C836.28 353.89 849.98 342.02 868.58 339.4 C887.17 336.79 903.62 344.43 905.31 356.46 Z',
      clipTo: 'forewing',
    },
    {
      id: 'abdomen',
      rank: 'outline',
      fill: 'pigment',
      d: 'M-46 379.1 C-51.4 433.67 -40.05 607.46 -36 701.49 C-31.95 795.52 -24.4 957.73 -19 1005.97 C-13.6 1054.21 -5.7 1023.07 0 1023.07 C5.7 1023.07 13.6 1054.21 19 1005.97 C24.4 957.73 31.95 795.52 36 701.49 C40.05 607.46 51.4 433.67 46 379.1 C40.6 324.53 13.8 337.7 0 337.7 C-13.8 337.7 -40.6 324.53 -46 379.1 Z',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-80 492.54 C-27.2 500.54 25.6 500.54 80 492.54',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-70 594.03 C-23.8 602.03 22.4 602.03 70 594.03',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-60 695.52 C-20.4 703.52 19.2 703.52 60 695.52',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-50 797.01 C-17 805.01 16 805.01 50 797.01',
      mirror: false,
    },
    {
      id: 'abdomen-segment',
      rank: 'detail',
      fill: 'none',
      d: 'M-40 892.54 C-13.6 900.54 12.8 900.54 40 892.54',
      mirror: false,
    },
    {
      id: 'thorax',
      rank: 'outline',
      fill: 'pigment-deep',
      d: 'M0 8.96 C27.06 8.96 76.91 36.47 95.52 62.69 C114.13 88.91 131.34 155.13 131.34 194.03 C131.34 232.93 114.13 309.4 95.52 337.31 C76.91 365.22 27.06 391.04 0 391.04 C-27.06 391.04 -76.91 365.22 -95.52 337.31 C-114.13 309.4 -131.34 232.93 -131.34 194.03 C-131.34 155.13 -114.13 88.91 -95.52 62.69 C-76.91 36.47 -27.06 8.96 0 8.96 Z',
      mirror: false,
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M22.45 87.5 C20.58 107.14 11.22 167 11.22 205.35 C11.22 243.69 20.58 298.88 22.45 317.58',
      clipTo: 'thorax',
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M56.12 93.11 C57.99 111.82 67.34 168.87 67.34 205.35 C67.34 241.82 57.99 294.2 56.12 311.97',
      clipTo: 'thorax',
    },
    {
      id: 'hatching',
      rank: 'detail',
      fill: 'none',
      d: 'M89.79 109.95 C91.66 125.85 101.95 174.48 101.01 205.35 C100.08 236.21 86.98 280.17 84.18 295.14',
      clipTo: 'thorax',
    },
    {
      id: 'head',
      rank: 'outline',
      fill: 'pigment-deep',
      d: 'M0 -32.84 C20.3 -32.84 58.95 -20.8 71.64 -8.96 C84.33 2.88 94.62 37.22 89.55 50.75 C84.48 64.28 48.51 80.65 35.82 86.57 C23.13 92.49 10.15 92.54 0 92.54 C-10.15 92.54 -23.13 92.49 -35.82 86.57 C-48.51 80.65 -84.48 64.28 -89.55 50.75 C-94.62 37.22 -84.33 2.88 -71.64 -8.96 C-58.95 -20.8 -20.3 -32.84 0 -32.84 Z',
      mirror: false,
    },
    {
      id: 'eye',
      rank: 'detail',
      fill: 'ink',
      d: 'M85.31 34.3 C88.18 50.61 79.05 65.86 64.91 68.35 C50.77 70.85 36.97 59.64 34.09 43.32 C31.22 27.01 40.35 11.76 54.49 9.27 C68.63 6.77 82.43 17.98 85.31 34.3 Z',
    },
    {
      id: 'antenna',
      rank: 'structure',
      fill: 'none',
      d: 'M41.79 32.84 C59.7 18.91 111.44 -21.89 149.25 -50.75 C187.06 -79.61 248.76 -125.38 268.66 -140.3',
    },
    {
      id: 'antenna',
      rank: 'structure',
      fill: 'none',
      d: 'M268.66 -140.3 C281.6 -149.25 323.39 -180.1 346.27 -194.03 C369.16 -207.96 396.02 -218.9 405.97 -223.88',
    },
    {
      id: 'antenna',
      rank: 'detail',
      fill: 'pigment-deep',
      d: 'M408.32 -211.4 C415.45 -213.09 428.49 -221.9 436.29 -227.65 C444.1 -233.39 456.42 -244.01 460.39 -249.72 C464.35 -255.42 464.71 -262.7 462.72 -265.69 C460.72 -268.69 453.87 -271.15 447.07 -269.68 C440.28 -268.22 425.74 -260.93 417.44 -255.93 C409.13 -250.94 395.98 -242.29 391.68 -236.36 C387.38 -230.43 386.27 -220.14 388.77 -216.39 C391.26 -212.65 401.19 -209.71 408.32 -211.4 Z',
    },
  ],
};
