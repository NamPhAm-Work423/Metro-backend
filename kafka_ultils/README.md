# Kafka Utilities (`kafka_ultils/`)

> End-to-end guide for producing & consuming events with Apache Kafka in the Metro-backend project.

---

## 1 . Why do we need this?
Micro-services communicate asynchronously via **domain events**. `kafka_ultils` is a tiny Python helper that lets any service:

* **publish** events (one-shot CLI or programmatically);
* **consume** events and run handler functions.

It runs **alongside** the Node.js services – no tight coupling, easy to swap for a full JS lib later.

---

## 2 . File overview

| File | Purpose |
|------|---------|
| `producer.kafka.py` | Fire-and-forget publisher. Pass `--topic` `--key` `--value` to push msg. |
| `consumer.kafka.py` | Long-running worker. Subscribes to topics, dispatches each record to a handler in `event.kafka.py`. |
| `event.kafka.py`    | Domain logic. Define functions like `handle_user_created(payload)` and map topics ⇒ handlers. |

---

## 3 . Prerequisites

1. **Kafka cluster**. In local dev we add to `docker-compose.yml`:
   ```yaml
   zookeeper:
     image: confluentinc/cp-zookeeper:7.6.0
   kafka:
     image: confluentinc/cp-kafka:7.6.0
     environment:
       KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
   ```
2. **Python 3.10+** inside the container/host that runs these scripts.
3. Python deps:
   ```bash
   pip install confluent-kafka python-dotenv
   ```

---

## 4 . Environment variables (`kafka_ultils/.env`)

| Var | Example | Description |
|-----|---------|-------------|
| `KAFKA_BROKER` | `kafka:9092` | Broker bootstrap string |
| `KAFKA_CLIENT_ID` | `api-gateway` | Logical app name (for metrics) |
| `USER_CREATED_TOPIC` | `user.created` | Demo topic |
| _…_ | | add more as you need |

All scripts auto-load `.env` via `python-dotenv`.

---

## 5 . Running the **consumer**
```bash
cd kafka_ultils
python consumer.kafka.py
```
Logs:
```
[consumer] Connected -> kafka:9092
[consumer] Subscribed: user.created passenger.created …
[handler] user.created  payload={...}
```
Run it under **PM2**, **systemd**, or package it as a Docker side-car.

---

## 6 . Publishing events

### 6.1 CLI
```bash
python producer.kafka.py \
  --topic user.created \
  --key 6ec0a411… \
  --value '{"userId":"6ec0…","email":"john@example.com"}'
```

### 6.2 From Node.js
Quick wrapper:
```js
const { execFile } = require('child_process');
const path = require('path');

exports.publish = (topic, key, payload) =>
  new Promise((res, rej) => {
    execFile('python', [
      path.join(__dirname, '../../kafka_ultils/producer.kafka.py'),
      '--topic', topic,
      '--key', key,
      '--value', JSON.stringify(payload)
    ], (err, out, errOut) => err ? rej(err) : res(out));
  });
```

---

## 7 . Writing handlers
Open `event.kafka.py`:
```python
def handle_user_created(msg):
    print(f"new user -> {msg['email']}")
    # call Passenger service etc.

HANDLERS = {
    'user.created': handle_user_created,
}
```
The consumer auto-routes based on topic.

---

## 8 . Health, retry & DLQ
* Producer checks delivery in the callback.
* Consumer catches exceptions; add custom retry or send to a `dead.letter` topic in the `except` block.

---

## 9 . Road-map ideas
| Idea | Benefit |
|------|---------|
| Migrate to **kafkajs** for full JS stack | Remove Python dependency |
| Add **Schema-Registry** (Avro/JSON) | Contract safety |
| Exactly-once + transactional producer | Financial use-cases |
| Automatic DLQ module | Better resiliency |

---

### TL;DR
1. Spin-up `kafka` & `zookeeper` in compose.  
2. Set `.env` with `KAFKA_BROKER`.  
3. Run `consumer.kafka.py`.  
4. Call `producer.kafka.py` (or wrapper) to emit events.  
5. Extend `event.kafka.py` with real business handlers.

Happy streaming! 🚂📡 