{
  description = "VisTeX development environment (Node.js + TeX Live) using Nix flakes";

  inputs = {
    # 安定版チャネルは必要に応じて変更してください
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        # `nix develop` で入る開発用シェル
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # Node.js (README では v16+ 推奨なので LTS を利用)
            nodejs

            # LaTeX, dvipng, dvisvgm など一式を含む TeX Live
            texlive.combined.scheme-full
          ];

          shellHook = ''
            echo "========================================="
            echo " VisTeX 開発用 Nix シェルに入りました"
            echo "-----------------------------------------"
            echo "初回セットアップ:"
            echo "  npm install"
            echo "  npm run install:all"
            echo ""
            echo "開発サーバー起動:"
            echo "  npm run dev"
            echo "========================================="
          '';
        };
      });
}

