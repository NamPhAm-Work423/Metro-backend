import importlib
import os
import sys
import subprocess
from types import ModuleType

__all__ = ['control_pb2', 'control_pb2_grpc', 'transport_pb2', 'transport_pb2_grpc']

_cache = {}


def _generate_protos_if_missing() -> None:
    """Generate gRPC python modules into this package if they are missing.

    This is a resilience helper for local/dev runs where generated files
    might not be present. In containers, generation also happens in the
    image build, so this is effectively a no-op there.
    """
    package_dir = os.path.dirname(__file__)
    # repo layout: this file is at src/ai_scheduler/proto/__init__.py
    src_dir = os.path.abspath(os.path.join(package_dir, os.pardir, os.pardir))
    repo_root = os.path.abspath(os.path.join(src_dir, os.pardir))
    proto_dir = os.path.join(repo_root, 'proto')

    # Ensure output directory exists
    os.makedirs(package_dir, exist_ok=True)

    control_out = os.path.join(package_dir, 'control_pb2.py')
    transport_out = os.path.join(package_dir, 'transport_pb2.py')

    if os.path.isfile(control_out) and os.path.isfile(transport_out):
        return

    # Only attempt if proto sources exist
    control_proto = os.path.join(proto_dir, 'control.proto')
    transport_proto = os.path.join(proto_dir, 'transport.proto')
    if not (os.path.isfile(control_proto) and os.path.isfile(transport_proto)):
        return

    try:
        args = [
            sys.executable,
            '-m', 'grpc_tools.protoc',
            f'-I{proto_dir}',
            f'--python_out={package_dir}',
            f'--grpc_python_out={package_dir}',
            control_proto,
            transport_proto,
        ]
        subprocess.check_call(args)

        # Fix relative imports inside generated *_pb2_grpc.py
        for fn in ('control_pb2_grpc.py', 'transport_pb2_grpc.py'):
            target = os.path.join(package_dir, fn)
            if os.path.isfile(target):
                with open(target, 'r+', encoding='utf-8') as f:
                    s = f.read()
                    s2 = s.replace('import control_pb2 as', 'from . import control_pb2 as')
                    s2 = s2.replace('import transport_pb2 as', 'from . import transport_pb2 as')
                    if s2 != s:
                        f.seek(0)
                        f.write(s2)
                        f.truncate()
    except Exception:
        # Best-effort: if generation fails, we leave it to the caller import to raise
        pass


def __getattr__(name: str) -> ModuleType:
    if name in __all__:
        if name not in _cache:
            try:
                _cache[name] = importlib.import_module(f'.{name}', __name__)
            except ModuleNotFoundError:
                _generate_protos_if_missing()
                _cache[name] = importlib.import_module(f'.{name}', __name__)
        return _cache[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
