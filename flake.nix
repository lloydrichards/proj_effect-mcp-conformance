{
  description = "my-effect-app development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: import nixpkgs { inherit system; };
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              nodejs_24
              pnpm
              git
            ];

            shellHook = ''
              echo "Bun $(bun --version)"
              echo "Node $(node --version)"
              echo "pnpm ${pkgs.pnpm.version}"
            '';
          };
        }
      );
    };
}
