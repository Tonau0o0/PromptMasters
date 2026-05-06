# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Neuro-Agent backend sidecar.

Build:
    uv run pyinstaller backend/main.spec --distpath dist-backend --workpath build-backend --noconfirm

Output:
    dist-backend/neuro-backend/  — entire onedir bundle
    dist-backend/neuro-backend/neuro-backend(.exe)  — entry binary

Notes:
- `onedir` (default) is preferred over `onefile` because ChromaDB/torch
  unpack-on-startup is too slow for `onefile`.
- Hidden imports cover dynamic registries (uvicorn protocols, chromadb backends,
  langchain integrations) that PyInstaller's static analysis misses.
"""
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

hiddenimports = []
# Dynamic protocol/registry loaders that PyInstaller can't statically detect
hiddenimports += collect_submodules("uvicorn")
hiddenimports += collect_submodules("chromadb")
hiddenimports += collect_submodules("langchain")
hiddenimports += collect_submodules("langchain_community")
hiddenimports += collect_submodules("langchain_text_splitters")
hiddenimports += collect_submodules("pypdf")
hiddenimports += collect_submodules("google.genai")
hiddenimports += [
    "docx",
    "openpyxl",
    "pandas",
    "pandas._libs.tslibs.base",
    "tokenizers",
    "onnxruntime",
    "fastapi",
    "pydantic",
    "pydantic_core",
    "h11",
    "anyio",
    "starlette",
    "google.auth",
    "google.api_core",
    "dotenv",
]

datas = []
datas += collect_data_files("chromadb")
datas += collect_data_files("langchain")
datas += collect_data_files("langchain_community")
datas += collect_data_files("langchain_text_splitters")

a = Analysis(
    ["main.py"],
    pathex=["."],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # The following are *not* needed at runtime; excluding shrinks the bundle.
        "tkinter",
        "matplotlib",
        "PIL",
        "IPython",
        "jupyter",
        "notebook",
        "pytest",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="neuro-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,  # No phantom console window on Windows
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="neuro-backend",
)
