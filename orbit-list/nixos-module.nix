self: { config, lib, pkgs, ... }:
let
  cfg = config.services.orbitlist;
  pkg = self.packages.${pkgs.system}.default;
in
{
  options.services.orbitlist = {
    enable = lib.mkEnableOption "Orbitlist-Backend (Anime-Tracker)";
    host = lib.mkOption { type = lib.types.str; default = "127.0.0.1"; description = "Bind-Adresse. Fuer Zugriff von aussen eine Netz-/VPN-Adresse setzen (nur mit passwordFile)."; };
    port = lib.mkOption { type = lib.types.port; default = 8787; };
    passwordFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path; default = null;
      description = "Datei mit dem Zugangspasswort (nur root lesbar, nicht im Nix-Store). Pflicht, sobald host nicht 127.0.0.1 ist.";
    };
    inbox = lib.mkOption {
      type = lib.types.nullOr lib.types.path; default = null;
      description = "Verzeichnis, in das ein externer Katalogbau anime.jsonl legt; Aenderung loest den Katalog-Import aus.";
    };
    inboxOwner = lib.mkOption { type = lib.types.str; default = "root"; description = "Besitzer der Inbox (darf die Datei ablegen)."; };
  };

  config = lib.mkIf cfg.enable {
    assertions = [{
      assertion = cfg.host == "127.0.0.1" || cfg.passwordFile != null;
      message = "services.orbitlist: ausserhalb von localhost ist passwordFile Pflicht.";
    }];

    users.users.orbitlist = { isSystemUser = true; group = "orbitlist"; };
    users.groups.orbitlist = { };

    systemd.services.orbitlist = {
      description = "Orbitlist Backend";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];
      environment.ANIME_DB = "/var/lib/orbitlist/anime.db";
      script = ''
        ${lib.optionalString (cfg.passwordFile != null) ''export ORBITLIST_PASSWORD="$(cat "$CREDENTIALS_DIRECTORY/password")"''}
        exec ${pkg}/bin/orbitlist --host ${cfg.host} --port ${toString cfg.port}
      '';
      serviceConfig = {
        User = "orbitlist";
        Group = "orbitlist";
        StateDirectory = "orbitlist";
        Restart = "on-failure";
        LoadCredential = lib.optional (cfg.passwordFile != null) "password:${cfg.passwordFile}";
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
        MemoryMax = "2G";
      };
    };

    systemd.tmpfiles.rules = lib.optional (cfg.inbox != null) "d ${cfg.inbox} 0755 ${cfg.inboxOwner} root -";

    systemd.paths.orbitlist-catalog = lib.mkIf (cfg.inbox != null) {
      wantedBy = [ "multi-user.target" ];
      pathConfig = { PathChanged = "${cfg.inbox}/anime.jsonl"; Unit = "orbitlist-catalog.service"; };
    };
    systemd.services.orbitlist-catalog = lib.mkIf (cfg.inbox != null) {
      description = "Orbitlist Katalog-Import aus der Inbox";
      environment.ANIME_DB = "/var/lib/orbitlist/anime.db";
      serviceConfig = {
        Type = "oneshot";
        User = "orbitlist";
        Group = "orbitlist";
        StateDirectory = "orbitlist";
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        ExecStart = "${pkg}/bin/orbitlist-py -m app.catalog ${cfg.inbox}/anime.jsonl";
      };
    };
  };
}
