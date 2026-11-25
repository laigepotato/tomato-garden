(() => {
  const byId = id => document.getElementById(id);
  const notice = byId("notice");
  const controls = byId("controls");
  const list = byId("members");
  const create = byId("create");
  const nickname = byId("nickname");
  const link = byId("link");
  const api = window.GARDEN_API?.replace(/\/$/, "");
  const adminKey = "tomato-garden-admin-v1";
  const login = byId("login");
  const password = byId("admin-password");
  let admin;
  let busy = false;

  try {
    admin = JSON.parse(sessionStorage.getItem(adminKey) || "null");
  } catch {
    admin = null;
  }
  if (!api) {
    notice.textContent = "好友花园服务还未启用。";
    return;
  }

  async function request(action, details = {}, credentials = admin) {
    const response = await fetch(api + "/manage/" + action, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...credentials, ...details}),
      signal:AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "暂时无法连接花园服务。");
    return data;
  }

  async function refresh() {
    const {members} = await request("list");
    list.replaceChildren();
    if (members.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "还没有成员。生成第一条用户链接后，成员会显示在这里。";
      list.append(empty);
    }
    for (const member of members) {
      const row = document.createElement("li");
      const profile = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = member.nickname;
      const progress = document.createElement("p");
      progress.textContent = "已收集 " + member.planted + " 次 · 累计专注 " + member.completed + " 次";
      profile.append(name, progress);
      row.append(profile);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "补发链接";
      button.setAttribute("aria-label", "为" + member.nickname + "补发链接");
      button.addEventListener("click", () => {
        if (busy || !window.confirm("补发后，" + member.nickname + "的旧链接会失效。好友需要打开新链接才能继续同步。")) return;
        change("reissue", {target:member.id}, member.nickname);
      });
      row.append(button);
      list.append(row);
    }
    controls.hidden = false;
  }

  async function change(action, details, name) {
    if (busy) return;
    busy = true;
    create.querySelector("button").disabled = true;
    try {
      const credentials = await request(action, details);
      const url = new URL("./", location.href);
      url.hash = "member=" + credentials.id + "." + credentials.secret;
      link.value = url.href;
      byId("result-title").textContent = name + "的专属链接";
      byId("result").hidden = false;
      notice.textContent = "链接已生成。";
      await refresh();
    } catch (error) {
      notice.textContent = error.message || "暂时无法管理花园链接。";
    } finally {
      busy = false;
      create.querySelector("button").disabled = false;
    }
  }

  create.addEventListener("submit", event => {
    event.preventDefault();
    const names = ["奶呼呼小番茄","打盹的小雏菊","月光小布丁","慢吞吞小松鼠","亮晶晶兔尾草"];
    const name = nickname.value.trim() || names[Math.floor(Math.random() * names.length)];
    if ([...name].length > 16) {
      notice.textContent = "花名最多 16 个字符。";
      return;
    }
    change("create", {nickname:name}, name);
  });

  byId("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link.value);
      notice.textContent = "链接已复制。";
    } catch {
      link.select();
      notice.textContent = "请手动复制选中的链接。";
    }
  });

  async function signIn() {
    const button = login.querySelector("button");
    button.disabled = true;
    try {
      await refresh();
      login.hidden = true;
      password.value = "";
      notice.textContent = "";
      try { sessionStorage.setItem(adminKey, JSON.stringify(admin)); } catch {}
    } catch (error) {
      login.hidden = false;
      notice.textContent = error.message || "暂时无法读取花园成员。";
    } finally {
      button.disabled = false;
    }
  }

  login.addEventListener("submit", async event => {
    event.preventDefault();
    const [id, secret, extra] = password.value.trim().split(".");
    const button = login.querySelector("button");
    button.disabled = true;
    try {
      admin = claim ? await request("claim", {token:claim, password:password.value}, null)
        : /^[0-9a-f-]{36}$/.test(id) && /^[0-9a-f]{64}$/.test(secret) && extra === undefined
        ? {id, secret}
        : await request("login", {password:password.value}, null);
      await signIn();
      if (claim && login.hidden) location.replace(location.pathname + location.search);
    } catch (error) {
      notice.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  const claim = new URLSearchParams(location.hash.slice(1)).get("setup");
  if (claim) {
    login.hidden = false;
    notice.textContent = "请设置 8 到 128 个字符的管理员密码。";
    password.autocomplete = "new-password";
    login.querySelector("button").textContent = "设置并登录";
  } else if (admin) signIn();
  else {
    login.hidden = false;
    notice.textContent = "请输入管理员口令以管理花园成员。";
  }
})();
