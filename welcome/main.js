const O = globalThis.Orbit;
const Plugin = O.Plugin;
const View = O.View;
O.Store;
O.MapStore;

const manifest = {
  id: "welcome",
  name: "Willkommen",
  version: "0.1.0",
  description: "Demo-Plugin — beweist, dass der Kern Plugins lädt, Views öffnet und Commands registriert.",
  author: "Sojus",
  main: "index.ts",
  type: "gui"
};
class WelcomeView extends View {
  getViewType() {
    return "welcome";
  }
  getDisplayName() {
    return "Willkommen";
  }
  getIcon() {
    return "home";
  }
  async onOpen() {
    const p = this.app.platform;
    this.containerEl.innerHTML = `
      <div style="max-width:620px;margin:0 auto;padding:40px 24px;line-height:1.6;color:var(--text)">
        <h1 style="color:var(--accent);margin-top:0">Der Kern läuft 🎉</h1>
        <p style="color:var(--text-muted)">
          Dieses Fenster wird von einem <strong>Plugin</strong> gerendert, nicht vom Kern.
          Der Kern hat nur drei Dinge getan: dieses Plugin geladen, seinen Menüpunkt
          registriert und diese View geöffnet.
        </p>
        <h3>Was du testen kannst</h3>
        <ul style="color:var(--text-muted)">
          <li>In der Sidebar auf <strong>Willkommen</strong> klicken → öffnet diese View</li>
          <li><strong>Ctrl+P</strong> → Kommandopalette, tippe „Hallo"</li>
          <li><strong>Einstellungen → Plugins</strong> → dieses Plugin an/aus schalten</li>
          <li><strong>Einstellungen → Allgemein</strong> → Hell/Dunkel/Auto</li>
        </ul>
        <div style="margin-top:24px;padding:16px;background:var(--bg);border:1px solid var(--border);border-radius:12px">
          <strong>Plattform erkannt:</strong><br>
          Typ: <code>${p.type}</code> · OS: <code>${p.os}</code> ·
          Mobil: <code>${p.isMobile}</code>
        </div>
      </div>
    `;
  }
  async onClose() {
    this.containerEl.innerHTML = "";
  }
}
class WelcomePlugin extends Plugin {
  constructor(app, m) {
    super(app, m);
  }
  async onload() {
    this.registerView("welcome", () => new WelcomeView(this.app));
    this.addNavigationItem({
      id: "welcome",
      name: "Willkommen",
      icon: "home",
      priority: 0
    });
    this.addCommand({
      id: "say-hello",
      name: "Hallo sagen",
      callback: () => {
        this.app.workspace.openView("welcome");
      }
    });
    this.addCommand({
      id: "open",
      name: "Willkommen öffnen",
      callback: () => this.app.workspace.openView("welcome")
    });
  }
  async onunload() {
  }
}

export { WelcomePlugin as default, manifest };
