{
  description = "Orbitlist — Anime-Tracker mit eigener Datenbank: Backend (FastAPI + SQLite) + Web-UI + NixOS-Modul";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in
    {
      packages = forAll (pkgs:
        let
          py = pkgs.python3.withPackages (p: [ p.fastapi p.uvicorn p.httpx p.pydantic ]);
          ui = pkgs.buildNpmPackage {
            pname = "orbitlist-ui";
            version = "0.1.0";
            src = ./plugin;
            npmDepsHash = "sha256-ewZp1e6+f5y2gJmJxImbYGEwNrshrZWqDGjSH2lz8zs=";
            installPhase = "cp -r dist $out";
          };
        in
        rec {
          inherit ui;
          default = pkgs.runCommand "orbitlist" { nativeBuildInputs = [ pkgs.makeWrapper ]; } ''
            mkdir -p $out/share/orbitlist $out/bin
            cp -r ${./backend}/app ${./backend}/mcp_server.py ${./nix}/sqlite_vec.py $out/share/orbitlist/
            makeWrapper ${py}/bin/uvicorn $out/bin/orbitlist \
              --chdir $out/share/orbitlist --set ORBITLIST_UI ${ui} --set SQLITE_VEC_SO ${pkgs.sqlite-vec}/lib/vec0.so \
              --add-flags "app.main:app"
            makeWrapper ${py}/bin/python $out/bin/orbitlist-py \
              --chdir $out/share/orbitlist --set ORBITLIST_UI ${ui} --set SQLITE_VEC_SO ${pkgs.sqlite-vec}/lib/vec0.so
          '';
        });

      nixosModules.default = import ./nixos-module.nix self;
    };
}
