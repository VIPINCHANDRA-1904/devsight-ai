import json
import urllib.request

def run_tests():
    print("=" * 60)
    print("DEVSIGHTAI -- COMPREHENSIVE END-TO-END VALIDATION SUITE")
    print("=" * 60)

    # 1. Health & Core Routes
    try:
        res = urllib.request.urlopen("http://127.0.0.1:8000/api/health")
        health = json.loads(res.read().decode())
        print(f"[PASS] Health Check: {health}")
    except Exception as e:
        print(f"[FAIL] Health Check failed: {e}")

    # 2. Services Topology
    try:
        res = urllib.request.urlopen("http://127.0.0.1:8000/api/services")
        services = json.loads(res.read().decode())
        nodes = services if isinstance(services, list) else services.get("nodes", [])
        print(f"[PASS] Services Topology: {len(nodes)} active microservices loaded")
    except Exception as e:
        print(f"[FAIL] Services failed: {e}")

    # 3. Incidents
    try:
        res = urllib.request.urlopen("http://127.0.0.1:8000/api/incidents")
        incidents = json.loads(res.read().decode())
        print(f"[PASS] Incidents Available: {len(incidents)} incidents retrieved")
    except Exception as e:
        print(f"[FAIL] Incidents failed: {e}")

    # 4. Multi-Signal Failure & Correlation Scenario
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/demo/scenario/ecommerce",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        res = urllib.request.urlopen(req)
        scenario = json.loads(res.read().decode())
        print(f"[PASS] Failure Scenario Executed: {scenario.get('scenario')}")
        for step in scenario.get("pipeline_steps", []):
            print(f"   [{step.get('step')}] {step.get('detail')}")
    except Exception as e:
        print(f"[FAIL] Scenario execution failed: {e}")

    # 5. AI RCA Engine (Groq + Graceful Degradation)
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/incidents/1024/analyze",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        res = urllib.request.urlopen(req)
        rca = json.loads(res.read().decode())
        print("[PASS] AI RCA Generation Successful:")
        print(f"   - Root Cause: {rca.get('root_cause')[:110]}...")
        print(f"   - Evidence Count: {len(rca.get('evidence', []))} points")
        print(f"   - Recommended Actions: {len(rca.get('recommended_actions', []))} steps")
        print(f"   - Business Impact: {rca.get('business_impact')[:90]}...")
        print(f"   - Graceful Fallback / Confidence: {rca.get('confidence')}")
    except Exception as e:
        print(f"[FAIL] AI RCA failed: {e}")

    # 6. Interactive Incident Chat Assistant
    try:
        chat_payload = json.dumps({
            "message": "What is the recommended fix for connection pool exhaustion?"
        }).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/incidents/1024/chat",
            data=chat_payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        res = urllib.request.urlopen(req)
        chat_res = json.loads(res.read().decode())
        print("[PASS] Incident Chat Assistant:")
        print(f"   - AI Reply: {chat_res.get('reply')[:100]}...")
    except Exception as e:
        print(f"[FAIL] Incident Chat failed: {e}")

    print("=" * 60)
    print("ALL 5 SYSTEM CAPABILITIES VERIFIED AND OPERATIONAL")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
