import { renderMarkdown } from "./markdown.js";
const $ = (id) => document.getElementById(id);
const run = $("run"), fixture = $("fixture");
const rows = [];
let current = [];
let files = [];
const json = (id, value) => { $(id).textContent = JSON.stringify(value, null, 2); window.Prism?.highlightElement($(id)); };
function showFixture() {
    const item = files[Number(fixture.value)];
    $("fixture-content").textContent = item?.contents || "Waiting for trusted fixtures.";
    $("fixture-source").textContent = item?.name || "";
}
fixture.onchange = showFixture;
function receive(e) {
    rows.push(e);
    current.push(e);
    if (e.type === "fixtures") {
        files = e.files;
        fixture.replaceChildren();
        files.forEach((file, i) => { const option = document.createElement("option"); option.value = String(i); option.textContent = file.name; fixture.append(option); });
        showFixture();
    }
    if (e.type === "options") {
        json("options", e.options);
        json("directories", { cwd: e.options.cwd, home: e.options.home, configHome: e.options.configHome, settingSources: e.options.settingSources, autoMemoryDisabled: e.options.autoMemoryDisabled, strictMcpConfig: e.options.strictMcpConfig });
    }
    if (e.type === "initialized") {
        json("init", e);
        $("session").textContent = e.sessionId;
    }
    if (e.type === "callback") {
        const li = document.createElement("li");
        li.textContent = e.event + " · actual programmatic callback";
        $("callbacks").append(li);
    }
    if (e.type === "answer")
        renderMarkdown($("answer"), e.text);
    if (e.type === "result") {
        $("status").textContent = e.status;
        $("cost").textContent = "$" + e.costUsd.toFixed(5);
        $("session").textContent = e.sessionId;
        renderMarkdown($("answer"), e.text);
    }
    if (e.type === "evidence") {
        json("markers", e.returnedMarkers);
        json("filesystem-hooks", e.filesystemHooks);
        $("callback-count").textContent = String(e.callbackCount);
        $("filesystem-count").textContent = String(e.filesystemHooks.length);
        $("read-paths").textContent = e.readPaths.join(", ") || "No completed model Read observed";
        const config = current.find(x => x.type === "options").config;
        const result = current.find(x => x.type === "result");
        const tr = document.createElement("tr");
        for (const value of [config.mode, config.tenant, e.returnedMarkers.join(", ") || "None of the fixture rule markers", String(e.callbackCount), String(e.filesystemHooks.length), result?.status || "No result", result?.sessionId || "—"]) {
            const td = document.createElement("td");
            td.textContent = value;
            tr.append(td);
        }
        $("history").append(tr);
    }
    if (e.type === "error" || e.type === "notice")
        $("notice").textContent = e.text;
    if (e.type === "error")
        $("status").textContent = "Could not finish";
    if (["message", "tool", "result", "error"].includes(e.type)) {
        const li = document.createElement("li"), title = document.createElement("strong"), detail = document.createElement("span");
        title.textContent = e.type;
        detail.textContent = JSON.stringify(e);
        li.append(title, detail);
        $("events").append(li);
    }
}
run.onclick = async () => {
    run.disabled = true;
    current = [];
    for (const id of ["callbacks", "events", "answer"])
        $(id).replaceChildren();
    $("status").textContent = "Running…";
    $("notice").textContent = "";
    $("callback-count").textContent = "0";
    $("filesystem-count").textContent = "0";
    json("markers", []);
    json("filesystem-hooks", []);
    const config = { mode: $("mode").value, tenant: $("tenant").value };
    try {
        const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
        if (!response.ok)
            throw new Error(await response.text());
        const reader = response.body.getReader(), decoder = new TextDecoder();
        let pending = "";
        while (true) {
            const { done, value } = await reader.read();
            pending += decoder.decode(value, { stream: !done });
            const lines = pending.split("\n");
            pending = lines.pop();
            for (const line of lines)
                if (line.trim())
                    receive(JSON.parse(line));
            if (done)
                break;
        }
        if (!current.some(e => e.type === "result"))
            $("status").textContent = "No final result";
    }
    catch (error) {
        $("status").textContent = "Could not finish";
        $("notice").textContent = error instanceof Error ? error.message : "Request failed.";
    }
    finally {
        run.disabled = false;
    }
};
$("download").onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lesson13-observations.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fetch("/api/config").then(r => r.json()).then(c => { $("configuration").textContent = c.ready ? "Key configured on the server. Model: " + c.model : "Configure your API key in .env and restart. See How to run."; run.disabled = !c.ready; }).catch(() => { $("configuration").textContent = "Cannot reach the local server."; });
