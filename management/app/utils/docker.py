"""
docker.py - Utility to interact with Docker from Python

- Setup: pip install docker
- Use docker SDK for Python (docker-py)

Main functions:
- check_docker_daemon(): Check if Docker daemon is running
- list_containers(all=False): List containers
- run_container(image, name=None, **kwargs): Run new container
- stop_container(container_id): Stop container
- get_container_logs(container_id, tail=100): Get container logs
"""

import docker
from docker.errors import DockerException

def check_docker_daemon():
    """Check if Docker daemon is running"""
    try:
        client = docker.from_env()
        client.ping()
        return True
    except DockerException as e:
        print(f"Docker daemon not available: {e}")
        return False

def list_containers(all=False):
    """List containers (all=True to get all containers including stopped ones)"""
    client = docker.from_env()
    return client.containers.list(all=all)

def run_container(image, name=None, **kwargs):
    """Run new container from image. kwargs: ports, environment, detach, ..."""
    client = docker.from_env()
    container = client.containers.run(image, name=name, **kwargs)
    return container

def stop_container(container_id):
    """Stop container by id or name"""
    client = docker.from_env()
    container = client.containers.get(container_id)
    container.stop()
    return True

def get_container_logs(container_id, tail=100):
    """Get container logs (tail: number of last lines)"""
    client = docker.from_env()
    container = client.containers.get(container_id)
    return container.logs(tail=tail).decode('utf-8') 