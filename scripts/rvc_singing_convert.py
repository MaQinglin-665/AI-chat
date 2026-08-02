"""Small isolated RVC inference runner, executed by the configured RVC Python."""
import argparse
import os
import sys
from pathlib import Path


def main():
    p = argparse.ArgumentParser()
    for name in ("rvc-root", "model-path", "index-path", "source", "output"):
        p.add_argument(f"--{name}", required=True)
    p.add_argument("--f0-method", default="pm")
    p.add_argument("--index-rate", type=float, default=0.75)
    args = p.parse_args()
    root = Path(args.rvc_root).resolve()
    sys.path.insert(0, str(root))
    extras = root / "py310-packages"
    if extras.is_dir(): sys.path.append(str(extras))
    os.chdir(root)
    os.environ["weight_root"] = str(Path(args.model_path).resolve().parent)
    os.environ["index_root"] = str(Path(args.index_path).resolve().parent)
    os.environ["outside_index_root"] = str(Path(args.index_path).resolve().parent)
    # RVC's Config parses process argv at import time (for WebUI flags).  Hide
    # this bridge's arguments before importing it.
    sys.argv = [sys.argv[0]]
    from configs.config import Config
    import infer.vc.modules as vc_modules
    vc_modules.index_root = str(Path(args.index_path).resolve().parent)
    import infer.vc.utils as vc_utils
    vc_utils.index_root = str(Path(args.index_path).resolve().parent)
    from infer.vc.modules import VC
    import soundfile as sf
    vc = VC(Config())
    vc.get_vc(Path(args.model_path).name)
    _, (rate, audio) = vc.vc_single(0, args.source, 0, args.f0_method, args.index_path, args.index_rate, 0, 0.25, 0.33)
    sf.write(args.output, audio, rate)


if __name__ == "__main__": main()
