let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  inherit (pkgs) nodejs-14_x;
in pkgs.mkShell rec { buildInputs = [ nodejs-14_x ]; }
