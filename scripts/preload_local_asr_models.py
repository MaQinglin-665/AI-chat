import argparse


def resolve_device(requested):
    value = str(requested or "auto").strip().lower()
    if value in {"cpu", "cuda"}:
        return value
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def main():
    parser = argparse.ArgumentParser(description="Preload private FunASR models for Xinyu Desktop Pet.")
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    args = parser.parse_args()

    from funasr import AutoModel

    device = resolve_device(args.device)
    print(f"Using local ASR device: {device}")
    models = [
        ("SenseVoiceSmall final refinement", "iic/SenseVoiceSmall"),
        ("Paraformer streaming preview", "paraformer-zh-streaming"),
    ]
    for label, model_name in models:
        print(f"Loading {label}: {model_name}")
        AutoModel(model=model_name, device=device, disable_update=True)
        print(f"Ready: {label}")
    print("Local hybrid ASR models are ready.")


if __name__ == "__main__":
    main()
