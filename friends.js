(() => {
  if (!window.GARDEN_API) return;
  const api = window.GARDEN_API.replace(/\/$/, "");
  const storageKey = "tomato-garden-friends-v1";
  const params = new URLSearchParams(location.hash.slice(1));
  const personal = params.get("member");
  let linkCredentials = personal ? (() => {
    const [id, secret] = personal.split(".");
    return {id, secret};
  })() : null;
  const panel = byId("friends");
  const profilePanel = byId("member-profile");
  const displayName = byId("current-flower-name");
  const nameDialog = byId("flower-name-dialog");
  const nameFeedback = byId("flower-name-feedback");
  const form = byId("friends-form");
  const nameField = byId("flower-name");
  const submit = byId("friends-submit");
  const gateStatus = byId("invite-status");
  const retry = byId("retry-invite");
  const restoreButton = byId("restore-member");
  const status = byId("friends-status");
  const list = byId("friends-members");
  let member;
  let syncing = false;
  let refreshing = false;
  let conflict = false;
  let verified = false;
  let displayedMembers = "";

  try {
    member = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    return;
  }

  function snapshot(nickname) {
    const progress = read();
    return {
      nickname, species:progress.species, growth:progress.growth, completed:progress.completed,
      garden:progress.garden
    };
  }

  function remember(next) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    member = next;
  }

  function showGarden() {
    verified = true;
    document.documentElement.classList.add("member-ready");
    if (!testMode) showProfile();
  }

  function lockGarden(message, canRetry) {
    verified = false;
    if (nameDialog.open) nameDialog.close();
    document.documentElement.classList.remove("member-ready");
    gateStatus.textContent = message;
    retry.hidden = !canRetry;
  }

  async function request(path, data) {
    const options = data ? {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)
    } : {};
    const response = await fetch(api + path, {...options, signal:AbortSignal.timeout(10000)});
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "暂时无法连接好友花园。");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function displayMembers(members) {
    const ranked = members.filter(friend => plants[friend.species]).sort((a, b) =>
      b.completed - a.completed || b.planted - a.planted || a.id.localeCompare(b.id)
    );
    const signature = JSON.stringify([member.id, ranked]);
    if (signature === displayedMembers) return;
    displayedMembers = signature;
    const scrollTop = list.scrollTop;
    list.replaceChildren();
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", "按累计专注次数排名");
    for (const [index, friend] of ranked.entries()) {
      const plant = plants[friend.species];
      const growth = Math.min(friend.growth, plant.need);
      const card = document.createElement("article");
      card.className = "friend";
      card.setAttribute("role", "listitem");
      const position = document.createElement("span");
      position.className = "friend-rank";
      position.textContent = String(index + 1);
      position.setAttribute("aria-label", "第 " + (index + 1) + " 名");
      const profile = document.createElement("div");
      profile.className = "friend-profile";
      const heading = document.createElement("h3");
      heading.textContent = friend.nickname + (friend.id === member.id ? "（你）" : "");
      if (index < 3) {
        card.classList.add(["friend-champion", "friend-runner-up", "friend-third"][index]);
        const star = document.createElement("span");
        star.className = "friend-award";
        star.textContent = ["★ 冠军", "亚军", "季军"][index];
        heading.append(star);
      }
      const detail = document.createElement("p");
      detail.textContent = plant.name + " · " + growth + " / " + plant.need + " 次";
      const progress = document.createElement("progress");
      progress.max = plant.need;
      progress.value = growth;
      progress.setAttribute("aria-label", "图鉴进度");
      const total = document.createElement("p");
      total.className = "friend-total";
      total.textContent = "专注 " + friend.completed + " 次 · 已收集 " + friend.planted + " 次";
      if (Number.isSafeInteger(friend.animals)) total.textContent += " · 动物 " + friend.animals + " 只";
      profile.append(heading, detail, progress);
      card.append(position, profile, total);
      list.append(card);
    }
    list.scrollTop = scrollTop;
  }

  async function refresh() {
    if (!verified || !member || testMode || document.hidden || refreshing) return;
    refreshing = true;
    const code = member.code;
    try {
      const {members} = await request("/garden", {id:member.id, secret:member.secret});
      if (member.code === code) {
        displayMembers(members);
        const current = members.find(friend => friend.id === member.id);
        if (current?.revision > member.revision && !syncing && !conflict && !read().active &&
            JSON.stringify(snapshot(member.nickname)) === member.synced) {
          await restore(member, false);
        }
      }
    } catch (error) {
      if (error.status === 403) {
        lockGarden("这个身份的链接已失效，请打开管理员补发的专属链接。", false);
      } else {
        status.textContent = "暂时无法刷新好友进度，联网后会自动重试。";
      }
    } finally {
      refreshing = false;
    }
  }

  async function syncProgress() {
    if (!verified || !member || testMode || syncing || conflict || document.hidden) return;
    const progress = snapshot(member.nickname);
    const serialized = JSON.stringify(progress);
    if (serialized === member.synced) return;
    syncing = true;
    try {
      const {revision} = await request("/progress", {
        ...progress, id:member.id, secret:member.secret, revision:member.revision
      });
      remember({...member, revision, synced:serialized});
    } catch (error) {
      if (error.status === 409) {
        conflict = true;
        restoreButton.hidden = false;
        status.textContent = "另一台设备已更新这个花园。恢复云端进度会覆盖本机尚未同步的进度。";
      } else if (error.status === 403) {
        lockGarden("这个身份的链接已失效，请打开管理员补发的专属链接。", false);
      } else {
        status.textContent = "花园进度已保存在本机，联网后会重试同步。";
      }
    } finally {
      syncing = false;
    }
  }

  async function restore(credentials, confirmReplace) {
    if (syncing || read().active) {
      status.textContent = "请在本轮专注结束后恢复花园。";
      return;
    }
    syncing = true;
    try {
      const remote = await request("/restore", {id:credentials.id, secret:credentials.secret});
      const local = read();
      if (local.active) {
        status.textContent = "请在本轮专注结束后恢复花园。";
        return;
      }
      const progress = {nickname:remote.nickname, ...backupProgress(migrate({...empty, ...remote}))};
      if (!confirmReplace && member && JSON.stringify(snapshot(member.nickname)) !== member.synced) return;
      if (confirmReplace && (local.completed || local.growth || local.garden.some(Boolean)) &&
          JSON.stringify(backupProgress(local)) !== JSON.stringify(backupProgress(progress)) &&
          !window.confirm("恢复会用这个身份的云端花园替换本机进度。要继续吗？")) {
        gateStatus.textContent = "你可以重新打开自己的专属链接继续使用。";
        retry.hidden = false;
        return;
      }
      save({...empty, ...backupProgress(progress), message:"已恢复云端花园。"});
      remember({
        id:credentials.id, secret:credentials.secret, code:remote.code,
        nickname:remote.nickname, revision:remote.revision, synced:JSON.stringify(progress)
      });
      if (linkCredentials) {
        linkCredentials = null;
      }
      conflict = false;
      restoreButton.hidden = true;
      showGarden();
      status.textContent = "已恢复云端花园。";
    } catch (error) {
      if (verified) status.textContent = error.message || "暂时无法恢复花园。";
      else lockGarden(error.message || "暂时无法恢复花园。", true);
    } finally {
      syncing = false;
    }
  }

  function showProfile() {
    panel.hidden = false;
    profilePanel.hidden = false;
    displayName.textContent = member.nickname;
  }

  byId("edit-flower-name").addEventListener("click", () => {
    profilePanel.querySelector("details").open = false;
    if (!verified || !member) return;
    nameField.value = member.nickname;
    nameFeedback.textContent = "";
    nameDialog.showModal();
  });
  byId("cancel-flower-name").addEventListener("click", () => nameDialog.close());

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!verified || !member) return;
    if (syncing || conflict) {
      nameFeedback.textContent = conflict ? "请先恢复云端进度，再修改花名。" : "正在同步，请稍后保存。";
      return;
    }
    const nickname = nameField.value.trim();
    if (!nickname || [...nickname].length > 16) {
      nameFeedback.textContent = "请输入 1 到 16 个字符的花名。";
      return;
    }
    submit.disabled = true;
    try {
      remember({...member, nickname});
      showProfile();
      nameDialog.close();
      await syncProgress();
      await refresh();
    } catch (error) {
      nameFeedback.textContent = error.message || "暂时无法连接好友花园。";
    } finally {
      submit.disabled = false;
    }
  });

  function randomName() {
    const pick = values => values[Math.floor(Math.random() * values.length)];
    return pick(["软绵绵","打盹的","奶呼呼","亮晶晶","慢吞吞","月光下的"]) +
      pick(["小番茄","小雏菊","棉花糖","兔尾草","小松鼠","布丁"]);
  }
  byId("random-name").addEventListener("click", () => { nameField.value = randomName(); });

  async function copyLink(fragment, message) {
    const url = new URL(location.href);
    url.hash = fragment;
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = message;
    } catch {
      status.replaceChildren(document.createTextNode("请复制此链接 "));
      const link = document.createElement("a");
      link.href = url.href;
      link.textContent = url.href;
      status.append(link);
    }
  }

  byId("share-member").addEventListener("click", () =>
    copyLink("member=" + member.id + "." + member.secret, "你的专属链接已复制，请妥善保存。")
  );
  restoreButton.addEventListener("click", () => {
    const credentials = linkCredentials || member;
    if (credentials) restore(credentials, true).then(refresh);
  });

  const refreshAndSync = async () => {
    await syncProgress();
    await refresh();
  };
  window.gardenFriends = {progressChanged:refreshAndSync};
  async function enter() {
    const credentials = linkCredentials || member;
    if (!credentials) return;
    retry.hidden = true;
    gateStatus.textContent = "正在验证专属链接。";
    if (linkCredentials && testMode) {
      location.replace(location.pathname + location.hash);
      return;
    }
    const switchingMember = linkCredentials &&
      (linkCredentials.id !== member?.id || linkCredentials.secret !== member?.secret);
    if (switchingMember) {
      await restore(linkCredentials, true);
      await refresh();
      return;
    }
    try {
      await request("/garden", {id:member.id, secret:member.secret});
      if (!testMode && !location.hash) {
        const url = new URL(location.href);
        url.hash = "member=" + member.id + "." + member.secret;
        history.replaceState(null, "", url);
      }
      showGarden();
      await refreshAndSync();
    } catch (error) {
      lockGarden(error.status === 403 ? "请打开管理员补发的专属链接。" : "暂时无法验证身份，请联网后重试。", error.status !== 403);
    }
  }
  retry.addEventListener("click", enter);
  byId("invite-link-form").addEventListener("submit", async event => {
    event.preventDefault();
    const field = byId("invite-link");
    let url;
    try { url = new URL(field.value.trim()); } catch {}
    const code = url && new URLSearchParams(url.hash.slice(1)).get("member");
    if (url?.origin !== location.origin || !/^[0-9a-f-]{36}\.[0-9a-f]{64}$/i.test(code || "")) {
      gateStatus.textContent = "请粘贴本站完整的专属链接。";
      return;
    }
    const [id, secret] = code.split(".");
    linkCredentials = {id, secret};
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      await enter();
      if (verified) field.value = "";
    } finally {
      button.disabled = false;
    }
  });
  enter();
  setInterval(refreshAndSync, 15000);
  window.addEventListener("online", refreshAndSync);
  document.addEventListener("visibilitychange", refreshAndSync);
})();
