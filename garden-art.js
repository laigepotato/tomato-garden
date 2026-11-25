// The four approved illustrations, with the ground supplied by the renderer.
const approvedGardenArt = {
  "银杏": "<path d=\"M97 138Q102 112 91 61l7-2 7 38 19-25 4 3-19 31-2 31Z\" fill=\"#a37d56\" stroke=\"#826347\" /><path d=\"M99 80Q64 97 57 68Q41 61 57 45Q63 27 82 32Q96 16 112 31Q131 29 137 44Q161 48 149 69Q143 88 119 77Q107 94 99 80Z\" fill=\"#e5b849\" stroke=\"#c39537\" /><path d=\"M96 74 68 51m28 23-9-33m13 31 12-28m-8 32 31-20\" fill=\"none\" stroke=\"#f7d77c\" stroke-width=\"2\" />",
  "草莓": "<path d=\"M100 135Q115 106 101 56M110 114l22-29M108 106 77 76\" fill=\"none\" stroke=\"#53794e\" stroke-width=\"3\" /><path d=\"M101 58Q72 65 69 42Q92 37 101 58Zm0 0q4-26 29-28-1 23-29 28Zm9 56q13-26 33-19-12 22-33 19Z\" fill=\"#72945f\" stroke=\"#527b52\" /><path d=\"M70 75Q57 70 55 83Q57 100 74 111Q91 100 92 83Q91 69 78 74Z\" fill=\"#dc6d75\" stroke=\"#b75161\" /><path d=\"m62 75 11-6 13 6-9 5-5-4-6 4Z\" fill=\"#739658\" /><path d=\"m65 86 2 2m8-4 1 2m7 2-1 2m-10 4 1 2m4 5-1 2\" stroke=\"#ffdb9b\" stroke-width=\"1.7\" stroke-linecap=\"round\" />",
  "垂耳兔": "<ellipse cx=\"79\" cy=\"112\" rx=\"25\" ry=\"23\" fill=\"#e4caba\" stroke=\"#9f8072\" /><circle cx=\"53\" cy=\"107\" r=\"9\" fill=\"#f4e7da\" stroke=\"#b19380\" /><path d=\"M116 109q17 14 8 24H95q-8-7 6-11\" fill=\"#f1decf\" stroke=\"#a18374\" /><ellipse cx=\"109\" cy=\"87\" rx=\"25\" ry=\"22\" fill=\"#f1decf\" stroke=\"#9f8072\" /><path d=\"M97 70q-13-8-19 7-4 14 3 31 4 7 10-3l11-25q3-8-5-10Z\" fill=\"#d8b5a5\" stroke=\"#a18374\" /><path d=\"M94 77q-8 0-10 21\" fill=\"none\" stroke=\"#efc1bb\" stroke-width=\"3\" stroke-linecap=\"round\" /><circle cx=\"118\" cy=\"85\" r=\"2.4\" fill=\"#573e38\" /><path d=\"m132 92-4 1\" stroke=\"#9d6371\" stroke-width=\"2\" stroke-linecap=\"round\" />",
  "七星瓢虫": "<path d=\"M53 124Q87 90 147 98Q119 132 53 124Z\" fill=\"#7da273\" stroke=\"#567d56\" /><path d=\"M66 121q39-12 69-19\" stroke=\"#b1c691\" fill=\"none\" /><g transform=\"translate(102 91) rotate(-21)\"><path d=\"M-18 9l-8 5m9-17-10 2m43 10 8 5m-9-17 10 2M-7-21l-7-7m21 7 7-7\" fill=\"none\" stroke=\"#523f43\" stroke-width=\"2\" stroke-linecap=\"round\" /><circle cy=\"-15\" r=\"10\" fill=\"#4d3b41\" /><ellipse rx=\"19\" ry=\"19\" cy=\"3\" fill=\"#db685e\" stroke=\"#ab4847\" /><path d=\"M0-14v35\" stroke=\"#7e3c42\" /><g fill=\"#4d3b41\"><circle cy=\"-11\" r=\"3\" /><circle cx=\"-8\" cy=\"-4\" r=\"2.7\" /><circle cx=\"8\" cy=\"-4\" r=\"2.7\" /><circle cx=\"-11\" cy=\"6\" r=\"2.6\" /><circle cx=\"11\" cy=\"6\" r=\"2.6\" /><circle cx=\"-6\" cy=\"13\" r=\"2.4\" /><circle cx=\"6\" cy=\"13\" r=\"2.4\" /></g></g>",
};

function gardenShape(path, fill, stroke = "#66564a") {
  return '<path d="' + path + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>';
}

function gardenOval(x, y, rx, ry, fill, stroke = "none") {
  return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" stroke="' + stroke + '"/>';
}

function gardenGroup(x, y, content, angle = 0) {
  return '<g transform="translate(' + x + ' ' + y + ') rotate(' + angle + ')">' + content + '</g>';
}

function smallFlower(form, color) {
  const shapes = {
    star:"M0 4C-5-2-10-10-5-17Q0-21 5-17C10-10 5-2 0 4Z",
    ruffle:"M0 5Q-12 0-11-12L-8-17-5-16-2-19 1-17 4-19 8-16 10-17Q13-6 0 5Z",
    trumpet:"M0 3Q-12-1-12-14Q-6-24 0-18Q8-23 13-14Q13-3 0 3Z",
    dahlia:"M0 3Q-8-6 0-23Q8-6 0 3Z",
    lotus:"M0 3Q-13-5 0-24Q13-5 0 3Z"
  };
  const count = {star:5, ruffle:9, trumpet:5, dahlia:11, lotus:7}[form] ?? 5;
  return petals(count, gardenShape(shapes[form] ?? shapes.star, color, "#a17976")) +
    (form === "dahlia" || form === "lotus" ? '<g transform="scale(.55)">' + petals(count, gardenShape(shapes[form], color, "#f6d5cb"), 15) + '</g>' : "") +
    gardenOval(0, 0, 4, 4, "#dbad5d");
}

function catalogFlower({form, petal}, base) {
  const stem = gardenShape("M100 " + base + "Q92 88 100 47", "none", "#53794e");
  const leaf = foliage("catalog");
  if (form === "bell") {
    const bell = gardenShape("M-7 0Q-5-10 0-10Q6-9 7 0L10 6Q1 11-10 6Z", petal, "#ac9c76");
    return stem + leaf + [0, 1, 2].map(i => {
      const x = i % 2 ? 111 : 88;
      const y = 51 + 12 * i;
      return gardenShape("M100 " + y + "q" + (x - 100) + " -8 " + (x - 100) + " 1", "none", "#53794e") + gardenGroup(x, y + 6, bell);
    }).join("");
  }
  if (["cluster", "spike", "spire"].includes(form)) {
    const positions = form === "cluster" ? [[-13,0],[0,-10],[14,-1],[0,8]] : [[0,-19],[-7,-9],[7,-5],[-9,4],[9,8],[0,15]];
    return stem + leaf + positions.map(([x, y]) =>
      gardenGroup(100 + x, 54 + y, '<g transform="scale(.48)">' + smallFlower(form === "spire" ? "ruffle" : "star", petal) + '</g>')
    ).join("");
  }
  return stem + leaf + gardenGroup(100, 51, smallFlower(form, petal));
}

function catalogLeaves({form, petal, category}, base) {
  const succulent = category === "succulent";
  if (form === "barrel" || form === "cactus" || form === "column") {
    const pad = gardenOval(0, 0, form === "barrel" ? 24 : 13, form === "column" ? 33 : 24, petal, "#52765a") +
      gardenShape("M-6-15v3m12 3v3m-8 4v3m10 5v3m-14 2v3", "none", "#ded3a4");
    return gardenGroup(100, base - 22, pad) + (form === "barrel" ? "" : gardenGroup(78, base - 36, pad, -27) + gardenGroup(121, base - 43, pad, 22));
  }
  if (form === "fern" || form === "fork") {
    return [-37, -12, 21, 43].map((angle, direction) => {
      const height = [53, 80, 67, 50][direction];
      const frond = gardenShape("M0 0Q-4-" + (height / 2) + " 0-" + height, "none", "#557d53");
      return gardenGroup(100, base, frond + Array.from({length:7}, (_, i) => {
        const size = Math.round((8 - i) * (form === "fork" ? 1.8 : 2.5));
        return gardenGroup(0, -Math.round(height * (.19 + .105 * i)),
          gardenShape("M0 2Q-" + size + " 1 -" + (size + 3) + " -10Q-5-11 0 0Q5-11 " + (size + 3) + " -10Q" + size + " 1 0 2Z", petal, "#608059"));
      }).join(""), angle);
    }).join("");
  }
  if (form === "float") {
    return [-23, 0, 22].map((x, i) => gardenOval(100 + x, base - 7 - i % 2 * 9, 14, 6, petal, "#638458")).join("");
  }
  const blades = {
    strap:"M0 8Q-33-21-17-53Q-14-25 0 8Z",
    zebra:"M0 8Q-14-20 0-51Q13-20 0 8Z",
    blade:"M0 8Q-13-16 0-56Q15-17 0 8Z",
    oval:"M0 5C-22-6-18-41 0-47C19-44 22-10 0 5Z",
    split:"M0 5Q-24-1-22-21l11 5-10-11q4-16 12-18l7 19-1-23q11-3 21 10l-9 14 14-6q9 27-20 36Z",
    heart:"M0 7Q-30-17-19-35Q-9-45 0-33Q12-47 23-32Q28-17 0 7Z",
    ivy:"M0 7-22-14-11-16-18-31-5-27 0-47 8-28 20-32 14-15 25-14Z",
    round:"M0 0C-21 2-25-27 0-31C24-28 22 1 0 0Z",
    mint:"M0 5-9-5-13-18-17-21-12-26-14-31-6-33 0-42l8 9 6 3-3 5 5 5-6 6-1 6Z",
    rosette:"M0 8Q-16-8-15-27Q-4-44 0-39Q12-35 15-25Q15-8 0 8Z",
    paw:"M0 8Q-13-9-11-27l2-11 5 2 2-4 5 3 4-2 4 11Q14-9 0 8Z",
    bead:"M0 6Q-12-5-10-23Q-8-34 0-34Q13-35 13-18Q12-4 0 6Z",
    stone:"M0 8Q-15 3-16-14Q-14-31 0-27Q15-31 17-14Q15 3 0 8Z",
    ears:"M0 2Q-3-9-10-21Q-16-42-9-45Q-3-45 1-25Q3-43 8-44Q17-42 10-22Z",
    trail:"M0 4Q-12-6-9-19Q3-27 9-19Q14-9 0 4Z",
    trap:"M0 5Q-22 0-23-11l8 2-3-8 9 5-1-9 6 6 4-11 4 10 7-7-1 9 9-4-4 8 8-1Q20 1 0 5Z",
    pitcher:"M0-30Q15-36 18-25L11-20Q18 1 6 8Q-10 15-11 0L-8-23Q-9-30 0-30Z",
    reed:"M-4 3V-24Q-10-30-7-43Q0-49 6-42Q10-32 4-24V3Z"
  };
  const angles = form === "trail" ? [-85,-56,-25,13,46,84] : succulent ? [-66, 63, -38, 35, -12, 11] : [-53, 42, -24, 19, 0];
  return angles.map((angle, i) => {
    const lift = succulent && form !== "trail" ? Math.abs(angle) / 4 : 13 + i * 4;
    const stem = gardenShape("M0 " + lift + "Q-4 10 0-6", "none", "#608359");
    const veins = form === "zebra" ? gardenShape("M-6-14l6 3 6-3m-11-7 5 3 5-3m-9-8 4 2 4-2m-7-8 3 2 3-2", "none", "#d9ddc0") :
      gardenShape("M0 1v-22", "none", "#e9e5be");
    return gardenGroup(100 + (i % 2 ? 1 : -1) * lift * .42, base - lift, stem + gardenShape(blades[form] ?? blades.oval, petal, "#587d60") + veins, angle);
  }).join("");
}

function catalogTree({form, petal}) {
  const trunk = gardenShape(form === "baobab" ? "M84 138q9-37 3-64l9-5 7 29 8-35 12 3q-12 44-7 72Z" :
    "M96 138q4-37-3-72l6-3 6 34 17-24 4 4-18 31-2 30Z", form === "birch" ? "#ded8c9" : "#a48060", "#80634f");
  if (form === "conifer") {
    return trunk + [0, 1, 2, 3].map(i => gardenGroup(100, 38 + i * 18,
      gardenShape("M0-17Q-7 3-" + (17 + i * 5) + " 16Q0 23 " + (17 + i * 5) + " 16Q8 1 0-17Z", petal, "#5d7865"))).reverse().join("");
  }
  const crowns = {
    willow:"M-44 25Q-44-20 0-27Q43-23 44 27Q38 44 34 24Q30 53 24 35Q16 56 11 28Q5 52-3 30Q-9 49-15 29Q-22 52-27 29Q-35 44-44 25Z",
    maple:"M0-30l9 13 14-8 2 13 17 2-8 14 12 9-16 10-12-1-6 9-13-8-12 9-11-12-14-1 2-12-10-11 15-6v-14l14 6Z",
    canopy:"M-51 17Q-63 8-52-4Q-35-20-15-15Q0-31 25-17Q48-18 54-1Q70 20 39 21Q15 33-8 24Q-38 32-51 17Z",
    bloom:"M-42 13Q-53-7-35-17Q-29-34-10-24Q13-35 21-23Q47-23 45-4Q62 13 41 23Q22 36 6 21Q-8 38-22 23Q-39 29-42 13Z",
    round:"M-38 10Q-51-4-32-15Q-22-33-4-22Q15-36 29-21Q47-16 44 1Q57 18 35 24Q14 36 1 22Q-16 35-29 23Q-41 23-38 10Z"
  };
  const details = form === "willow" ? "M-32-2q-9 16-5 24m10-36q-11 32-4 45m16-50q-3 24-3 51m17-52q1 29-2 42m17-38q9 24 8 47m8-46q12 22 8 39" :
    "M-24-1q9-9 17-7m13-8q10 0 14 8m-38 24q7-6 14-4m15 0q11-9 17-4";
  return trunk + gardenGroup(100, 66, gardenShape(crowns[form] ?? crowns[form === "baobab" ? "canopy" : "round"], petal, "#697b5a") +
    gardenShape(details, "none", "#e6d6ab"));
}

function catalogHarvest({form, petal, category}, base) {
  const isCrop = category === "crop";
  const upright = ["corn","grain","pineapple","carrot","mushroom","enoki","root","cabbage","ruffle","floret","pumpkin"].includes(form);
  const stem = upright ? "" : gardenGroup(100, base, gardenShape("M0 0Q11-31 1-73M4-36-24-55m29 18 25-22", "none", "#577e55") +
    gardenShape("M1-69Q-16-66-26-83Q-8-90 1-69Zm1 0q7-24 29-24-1 17-29 24Zm4 36q14-24 31-20-12 18-31 20Z", "#7d9d69", "#557d58"));
  const paths = {
    apple:"M0-17Q-26-30-25-5Q-23 19-9 24Q0 19 9 24Q25 21 26-8Q23-28 0-17Z",
    pear:"M-8-24Q-10-2-21 4Q-29 29 0 31Q29 32 23 10Q9-9 8-24Q1-33-8-24Z",
    crown:"M-19-14l-2-14 11 8 10-8 8 8 12-8-4 15q15 14 7 33-6 14-24 15-24-4-25-21-2-18 7-28Z",
    tomato:"M0-15Q-25-22-29 0Q-31 21-8 26Q1 23 6 26Q34 23 28-4Q23-22 0-15Z",
    oval:"M0-26Q21-24 22 2Q20 29 0 31Q-22 30-22 2Q-20-23 0-26Z",
    pepper:"M-11-22Q-24-21-23-7l5 26q7 13 17 6 14 6 20-8l5-24Q24-25 9-22Q2-29-11-22Z",
    gourd:"M-20-24Q-10-27-5-12Q-1 6 23 9Q39 17 26 29Q5 37-15 21Q-33 2-20-24Z",
    ribbed:"M-19-23Q-9-30-1-15Q4-3 19 1Q38 4 28 21Q12 34-10 17Q-31 1-19-23Z",
    pod:"M-28-17Q-14-12 3 2Q18 14 31 12Q24 30 4 24Q-19 13-28-17Z",
    peas:"M-33-9Q-19-21 3-11Q26-1 33 12Q15 27-10 16Q-32 5-33-9Z",
    dragon:"M0-33l9 12 13-7-2 13 14 2-8 10 8 10-10 5 1 13-12-2-11 9-9-7-15-2 4-12-13-6 11-7-4-12 14 1Z",
    root:"M-19-12Q-15-26 0-23Q22-26 23-8Q23 7 1 19l-5 14-3-15Q-26 10-19-12Z",
    carrot:"M-15-21Q1-28 17-20Q15 2-2 34Q-8 39-9 30Z",
    corn:"M0-49Q15-49 15-30v46Q1 33-15 17v-46Q-14-47 0-49Z",
    pineapple:"M-19-16Q-14-24 0-22Q14-24 20-16l4 30Q20 32 0 34q-22-1-24-20Z"
  };
  let produce = gardenShape(paths[form] ?? paths.oval, petal, "#9c685b");
  if (form === "bunch" || form === "drupe") {
    const positions = form === "bunch" ? [[-13,-11],[0,-15],[14,-10],[-8,1],[8,2],[0,13]] : [[-9,-7],[1,-11],[11,-7],[-10,3],[1,0],[11,5],[-4,12],[5,13]];
    produce = positions.map(([x,y]) => gardenOval(x,y,form === "bunch" ? 10 : 7,form === "bunch" ? 10 : 7,petal,"#715c75") + gardenOval(x-2,y-2,2,1.5,"#e4c4cb")).join("");
  } else if (["cabbage","ruffle","floret","pumpkin"].includes(form)) {
    produce = [-23, 23, -12, 12, 0].map((x, i) => gardenOval(x, 8 - i * 3, 14, form === "floret" ? 14 : 22, petal, form === "pumpkin" ? "#ac7548" : "#75855d")).join("");
    produce += gardenShape("M0-18Q1-30 9-32", "none", "#5e825c");
  } else if (form === "mushroom" || form === "enoki") {
    produce = [-21, 20, 0].map((x, i) => gardenGroup(x, 19 - i * 13,
      gardenShape("M-4 14-5-10H4l3 24Z", "#e8d6b7", "#ab927a") +
      gardenShape(form === "enoki" ? "M-8-8q0-16 8-16 9 0 8 16Z" : "M-16-8Q-15-28 0-27Q15-26 17-8Q0-2-16-8Z", petal, "#92715d"))).join("");
  } else if (form === "grain") {
    produce = [-18, 2, 20].map((x, i) => gardenGroup(x, 22 - i * 5, gardenShape("M0 11V-63", "none", "#887e52") +
      Array.from({length:5}, (_, row) => gardenGroup(0, -22 - row * 8,
        gardenShape("M0 4Q-13 3-12-10Q-4-11 0 0Q4-11 12-10Q13 3 0 4Z", petal, "#9a875b"))).join(""), x * .65)).join("");
  } else {
    const leaves = "M0-19Q-11-19-14-29Q-4-30 0-23Q1-35 11-36Q14-26 0-19Z";
    produce += gardenShape(form === "pineapple" || form === "corn" ? "M-12 5q-11-27-5-46l10 11 7-21 8 21 11-15q3 24-6 53l-13 13Z" : leaves, "#799761", "#5c7e53");
    if (["pineapple","corn","ribbed","peas"].includes(form)) {
      produce += gardenShape("m-11 1 20 17m-18-8 17-14m-22 7 22 17m-16 2 21-17", "none", "#e7ce91");
    } else {
      produce += gardenShape("M-12-6q-6 6-3 11", "none", "#f7d0bb");
    }
  }
  return stem + gardenGroup(upright ? 100 : 85, upright ? base - 32 : base - (isCrop ? 48 : 53), produce);
}

function catalogMammal({form, petal}) {
  const outline = "#8b6d60";
  const cream = "#ebd7bc";
  const standing = ["alpaca", "goat", "deer", "horse"].includes(form);
  const long = ["ferret", "otter"].includes(form);
  const masks = ["panda", "raccoon", "ferret", "glider"].includes(form);
  const tall = form === "alpaca" || form === "deer" || form === "horse";
  const height = tall ? 69 : standing ? 84 : long ? 104 : 93;
  const tails = {
    squirrel:"M-16 5Q-52 12-52-23Q-53-52-33-52Q-15-46-31-29Q-33-11-15-11Z",
    panda:"M-15 3Q-47 12-57-7Q-59-16-49-17Q-41-9-15-14Z",
    raccoon:"M-15 3Q-47 12-57-7Q-59-16-49-17Q-41-9-15-14Z",
    ferret:"M-17 5Q-44 15-54-2Q-57-6-53-8Q-34 5-22-5Z",
    otter:"M-15 4Q-43 17-61 5Q-62 1-55 0L-19-8Z",
    dog:"M-18 5Q-43 5-40-17Q-38-32-24-30Q-13-24-21-17Q-32-22-29-10L-13-8Z",
    cat:"M-19 2Q-46 10-44-11Q-41-28-40-34Q-36-38-34-34Q-31-20-36-12Q-39-1-20-5Z",
    horse:"M-19-9Q-49-7-44 20Q-39 29-30 30Q-40 15-21-1Z"
  };
  let art = gardenGroup(88, standing ? 102 : 115, gardenShape(tails[form] ?? "M-21-3q-13-12-16 0 2 11 16 11Z", petal, outline) +
    (["panda","raccoon"].includes(form) ? gardenShape("M-37-12l5 12m-15-13 4 11", "none", "#705e5a") : "") +
    (standing ? gardenShape("M-20 4l-2 29h7l5-20 4-5 2 25h7l3-26 9-4 2 14-1 16h7l6-27Z", petal, outline) : "") +
    (form === "hedgehog" ? gardenShape("M-34 12l-5-11 5-4-2-9 7-2 2-10 8 1 5-8 7 5 9-5 7 6 10-2 4 7 8 3 1 9 5 8-5 12Z", petal, outline) :
      gardenOval(0, 0, long ? 34 : 27, long ? 14 : 21, petal, outline)));
  if (standing) art += gardenShape(tall ? "M101 105q11-16 10-43l17-2 4 41Z" : "M102 107q6-20 6-25l16-5 7 26Z", petal, outline);
  if (!standing) art += gardenOval(109, 129, 14, 6, cream, outline);
  const ears = ["cat","dog","panda","squirrel","goat","deer","horse","alpaca"].includes(form) ?
    gardenShape("M-15-9l-4-19q12 0 14 12m15 0q4-11 13-12l-3 18", petal, outline) :
    gardenOval(-12, -11, form === "chinchilla" ? 10 : 7, form === "chinchilla" ? 12 : 8, petal, outline) +
    gardenOval(9, -12, 7, 7, petal, outline);
  const horns = form === "goat" ? gardenShape("M-8-13q-7-12-4-20 9 9 11 15m4 0q4-16 12-16 0 9-5 19", "#ac9a82", outline) :
    form === "deer" ? gardenShape("M-5-13l-5-17-7-7m7 8 2-10m16 24 5-16 5-9m-5 9 7-3", "none", outline) : "";
  const face = gardenOval(0, 0, long ? 20 : 18, long ? 13 : 16, petal, outline) +
    (masks ? gardenShape("M-15-5q9-7 16 2 8-8 15-1-4 13-14 9-12 5-17-10Z", form === "panda" ? cream : "#786763") : "") +
    gardenOval(11, 7, 11, 7, form === "mole" ? "#bf8e87" : cream, outline) +
    gardenOval(7, -3, 2, 2.2, "#4e4141") + gardenOval(19, 5, 2.6, 1.8, "#755356");
  return art + gardenGroup(standing ? 119 : 114, height, horns + ears + face);
}

function catalogWaterside({form, petal}) {
  const outline = "#756e66";
  if (["goldfish", "koi", "betta"].includes(form)) {
    const large = form !== "koi";
    return gardenGroup(101, 99, gardenShape(large ? "M-16-2q-23-15-39-18 13 18 5 42 19-9 34-20Z" :
      "M-16-2q-21-12-33-17l7 17-8 17q16-3 34-13Z", petal, outline) +
      gardenShape("M-18-5Q-3-26 17-17Q39-9 28 8Q18 24-6 17Q-21 13-18-5Z", petal, outline) +
      gardenShape("M-9-16q-1-11 15-15l4 15M-4 1q-9 11 4 15l7-12", petal, outline) +
      (form === "koi" ? gardenOval(7, -8, 9, 5, "#cd7968") + gardenOval(-5, 10, 8, 5, "#cc7967") : gardenShape("M2-8q6 4 0 8m7-1q5 4 0 8", "none", "#e7c39e")) +
      gardenOval(22, -5, 2.3, 2.3, "#51464b"));
  }
  if (form === "frog") {
    return gardenOval(100, 119, 31, 15, petal, "#678763") + gardenOval(100, 105, 25, 19, petal, "#678763") +
      [84, 116].map(x => gardenOval(x, 87, 9, 9, petal, "#678763") + gardenOval(x, 86, 2.4, 3, "#4e4e42")).join("") +
      gardenShape("M85 109q15 12 30 0m-24 19-10 6m28-6 10 6", "none", "#62805d");
  }
  if (form === "turtle") {
    return gardenOval(129, 113, 15, 10, "#9cab79", "#73805b") + gardenOval(126, 126, 8, 8, "#9cab79", "#73805b") +
      gardenOval(81, 126, 8, 8, "#9cab79", "#73805b") + gardenOval(101, 112, 28, 19, petal, "#73805b") +
      gardenShape("M85 101l6 13-4 12m4-12h18l9-10m-9 10 5 12", "none", "#6c7656") + gardenOval(136, 109, 1.8, 1.8, "#51464b");
  }
  const longNeck = form === "heron" || form === "swan";
  const swimmer = form === "duck" || form === "swan";
  const headY = longNeck ? 68 : 84;
  const tail = form === "swallow" ? "M-17 0-53-3l16 10-13 12 33-10Z" : "M-17 1-45 3q4 15 28 10Z";
  const beak = form === "humming" || form === "kingfisher" || form === "heron" ? 25 : swimmer ? 16 : 10;
  return (swimmer ? "" : gardenShape(form === "heron" ? "M93 111l4 15-10 13m20-28-2 18 7 8" : "M93 117v14l-7 3m20-17-1 14 8 2", "none", "#a48963")) +
    gardenGroup(99, 107, gardenShape(tail, petal, outline) +
      gardenOval(0, 0, 26, 17, petal, outline) +
      gardenShape("M5-6Q-14-16-26 0Q-14 14 3 8Z", petal, outline) +
      gardenShape("M-19 1q7 5 15 4", "none", "#e5d6b7")) +
    (longNeck ? gardenShape("M107 112Q128 91 109 " + headY + "l-11 3q16 20 2 34Z", petal, outline) : "") +
    gardenGroup(112, headY, (form === "cockatiel" || form === "hoopoe" ?
      gardenShape("M-11-5q-9-18-18-22 19 5 26 17m-7 0q0-15-7-22 18 7 18 23", petal, outline) : "") +
      gardenOval(0, 0, 14, 12, petal, outline) +
      gardenShape("M12-4l" + beak + " 5-16 6Z", "#c69c61", "#927553") +
      gardenOval(5, -3, 1.9, 2, "#4d4244") +
      (["cockatiel","kingfisher","magpie"].includes(form) ? gardenOval(0, 3, 4, 3, form === "cockatiel" ? "#d68f6c" : "#e7d9b9") : ""));
}

function catalogInsect({form, petal}) {
  const outline = "#675658";
  if (form === "snail" || form === "worm") {
    const creature = form === "snail" ? gardenShape("M-37 14q4-9 18-9h31q4-19 13-19 10-2 12 10l-4 15q-11 8-61 8Z", "#9aab7d", "#697f60") +
      gardenOval(-8, -3, 20, 18, petal, outline) + gardenShape("M6-5q-3-13-15-9-10 5-5 13 5 6 12 2", "none", "#986f5e") +
      gardenShape("M24-12q-2-9-8-10m15 8 6-10", "none", "#697f60") :
      gardenShape("M-37 8q12 8 23-6 12-16 24-9 12 6 26 5 9 3 2 11-16 8-31-1Q1 4-7 15q-14 19-32 2-4-6 2-9Z", petal, outline) +
      gardenShape("M-23 12l3 8m4-11 5 7m4-16 6 5m4-10 2 9m7-10-3 9m14-5-2 10", "none", "#a96e6c");
    return gardenGroup(100, 112, creature);
  }
  const wings = {
    butterfly:"M-2 1Q-26-37-39-24Q-53-5-24 9Q-37 32-15 30Q-6 28 0 7Z",
    swallowtail:"M-2 1Q-30-42-44-30Q-50-10-26 7Q-36 27-24 31l-7 13 13-12Q-6 30 0 7Z",
    dragonfly:"M-2 0Q-30-23-48-17Q-56-11-38-5L-6 3Q-43 1-44 10q0 10 42-4Z",
    bee:"M-2 2Q-12-29-28-23Q-40-12-18-1Z",
    firefly:"M-1-13Q-15-17-20 1Q-21 17-7 22Z",
    cicada:"M-2-12Q-21-19-30 12Q-30 29-19 27L-1 5Z"
  };
  const flying = Boolean(wings[form]);
  const elongated = ["dragonfly","mantis","stick","cricket"].includes(form);
  const thorax = gardenOval(0, 0, elongated ? 6 : 12, elongated ? 26 : 19, petal, outline);
  const limbs = gardenShape(form === "spider" ? "M-7-8-18-18-28-15m19 13-15-6-11 5m25 7-13 3-11 8m25-6-9 9-4 9M7-8l11-10 10 3m-19 13 15-6 11 5m-25 7 13 3 11 8m-25-6 9 9 4 9" :
    form === "mantis" ? "M-4-12-18-22-20-10m24-2 14-10 2 12M-4 3l-17 1-5 13M4 3l17 1 5 13M-4 12l-14 11m22-11 14 11" :
    "M-7-7l-13-6m12 12-16 3m16 6-11 9M7-7l13-6M8-1l16 3M8 8l11 9", "none", outline);
  const wing = flying ? gardenShape(wings[form], form === "bee" || form === "dragonfly" || form === "cicada" ? "#d4ddd4" : petal, outline) +
    gardenShape("M-3 3q-13-8-22-11", "none", "#f1d6bb") : "";
  const markings = form === "bee" || form === "pillbug" || form === "firefly" ?
    gardenShape("M-10-7q10 5 20 0M-11 0q11 6 22 0M-10 8q10 5 20 0", "none", form === "firefly" ? "#e9d58a" : outline) :
    form === "beetle" || form === "stag" ? gardenShape("M0-14v31", "none", outline) : "";
  const horns = form === "stag" || form === "beetle" ?
    gardenShape("M-5-17q-15-5-12-17l3 5 4-1 2 6 6 2m7 5q15-5 12-17l-3 5-4-1-2 6-6 2", outline) :
    gardenShape("M-3-16l-6-8m12 8 6-8", "none", outline);
  return gardenGroup(101, 93, limbs + (form === "bee" ? thorax : "") + wing + '<g transform="scale(-1 1)">' + wing + '</g>' +
    (form === "bee" ? "" : thorax) + gardenOval(0, -16, elongated ? 5 : 7, 6, outline) + horns + markings, elongated ? -18 : -9);
}

const catalogRenderers = {
  flower:catalogFlower, foliage:catalogLeaves, succulent:catalogLeaves, tree:catalogTree,
  fruit:catalogHarvest, crop:catalogHarvest, mammal:catalogMammal, waterside:catalogWaterside, insect:catalogInsect
};

function catalogIllustration(entry, phase, miniature, soil, pot) {
  const ground = entry.animal || entry.category === "tree" || miniature;
  const base = ground ? 136 : 111;
  const art = approvedGardenArt[entry.name] ?? catalogRenderers[entry.category](entry, base);
  const approvedGround = entry.name === "草莓";
  const full = approvedGround && !ground ? '<g transform="translate(0 -25)">' + art + '</g>' : art;
  let growth = full;
  if (phase !== "bloom") {
    if (entry.animal) {
      const tracks = gardenGroup(100, 105, [-1, 1].map(side =>
        gardenGroup(side * 14, side * 11, gardenOval(0, 0, 5, 4, "#a5846c") +
          [-5, 0, 5].map((x, i) => gardenOval(x, i === 1 ? -7 : -5, 1.9, 2.3, "#a5846c")).join(""), side * 15)
      ).join(""));
      const rustle = gardenShape("M62 136Q52 127 53 113Q62 115 66 126Q60 108 67 94Q76 103 76 121Q81 105 90 104Q93 118 85 128Q95 121 103 124Q98 134 87 136Z", "#83a16f", "#658459") +
        gardenShape("M70 106Q67 119 72 132M85 112Q83 123 76 132", "none", "#bfd19c") +
        gardenShape("M50 104l-6-5m11-3-3-8m35 9 4-8", "none", "#9bab7b");
      growth = phase === "bud" ? '<g transform="translate(22 2)">' + tracks + '</g>' + rustle : phase === "sprout" ? tracks :
        gardenShape("M96 137q-1-12-8-17 10 0 13 13 4-16 13-18-2 12-10 22Z", "#83a16f", "#658459");
    } else if (phase === "seed") {
      growth = gardenOval(100, base - 2, 7, 3.8, "#745741", "#624731");
    } else {
      const scale = phase === "sprout" ? .34 : .65;
      growth = '<g transform="translate(100 ' + base + ') scale(' + scale + ') translate(-100 -' + base + ')">' + full + '</g>';
    }
  }
  return '<svg class="plant-art" viewBox="' + (miniature ? "35 8 130 146" : "0 0 200 160") + '" aria-hidden="true">' +
    (ground ? soil : pot) + growth + '</svg>';
}
