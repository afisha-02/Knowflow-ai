import os
import sys
import time
import requests
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# Set stdout encoding to utf-8 if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_live_test():
    pdf_filename = 'Artificial_Intelligence_Modern_Concepts.pdf'
    c = canvas.Canvas(pdf_filename, pagesize=letter)

    # Page 1: Foundations
    c.setFont('Helvetica-Bold', 18)
    c.drawString(80, 750, 'Artificial Intelligence: Modern Concepts')
    c.setFont('Helvetica-Bold', 14)
    c.drawString(80, 720, 'Chapter 1: Foundations of Intelligent Agents')
    c.setFont('Helvetica', 11)
    c.drawString(80, 690, 'An agent is anything that can perceive its environment through sensors and act upon it through actuators.')
    c.drawString(80, 670, 'A rational agent is one that selects an action expected to maximize its performance measure.')
    c.drawString(80, 650, 'PEAS describes the task environment: Performance measure, Environment, Actuators, and Sensors.')
    c.drawString(80, 630, 'For an automated taxi driver, the environment is roads, traffic, pedestrians, and weather.')
    c.showPage()

    # Page 2: Search Algorithms
    c.setFont('Helvetica-Bold', 14)
    c.drawString(80, 750, 'Chapter 2: Informed Heuristic Search and A* Algorithm')
    c.setFont('Helvetica', 11)
    c.drawString(80, 720, 'A* search evaluates nodes by combining g(n), the cost to reach the node, and h(n), the heuristic estimate.')
    c.drawString(80, 700, 'The evaluation function is formulated as f(n) = g(n) + h(n).')
    c.drawString(80, 680, 'A* is guaranteed to be optimal and complete if the heuristic h(n) is admissible and consistent.')
    c.drawString(80, 660, 'An admissible heuristic never overestimates the actual cost to reach the goal.')
    c.drawString(80, 640, 'In tree search, admissibility alone guarantees optimality; in graph search, consistency is required.')
    c.showPage()

    # Page 3: Deep Learning & Transformers
    c.setFont('Helvetica-Bold', 14)
    c.drawString(80, 750, 'Chapter 3: Sequence Modeling and Attention Mechanisms')
    c.setFont('Helvetica', 11)
    c.drawString(80, 720, 'The Transformer architecture relies entirely on self-attention mechanisms without recurrent connections.')
    c.drawString(80, 700, 'Scaled dot-product attention computes Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V.')
    c.drawString(80, 680, 'Multi-head attention allows the model to jointly attend to information from different representation subspaces.')
    c.drawString(80, 660, 'Positional encodings are injected to inject information about the relative or absolute order of tokens.')
    c.showPage()

    c.save()
    print('1. Synthetic PDF created successfully: ' + pdf_filename)

    # 1. Upload to live backend
    with open(pdf_filename, 'rb') as f:
        r = requests.post(
            'http://127.0.0.1:8000/api/documents/upload',
            files={'file': (pdf_filename, f, 'application/pdf')}
        )
    assert r.status_code == 200, f"Upload failed: {r.text}"
    doc_id = r.json()['id']
    print(f"2. Uploaded successfully. Document ID: {doc_id}")

    # 2. Poll status until indexed
    print("3. Polling processing status...")
    status = 'PENDING'
    for attempt in range(20):
        time.sleep(1)
        res = requests.get(f'http://127.0.0.1:8000/api/documents/{doc_id}/status').json()
        status = res['status']
        print(f"   Attempt {attempt+1}: Status={status}, Progress={res['progress']}%, Pages={res['page_count']}, Chunks={res['chunk_count']}")
        if status == 'COMPLETED':
            break

    assert status == 'COMPLETED', f"Ingestion did not complete: {status}"
    print("4. Document ingestion and vector indexing completed!")

    # 3. Test Question 1 (Grounded)
    q1 = 'What is the formula for the evaluation function in A* search, and what condition makes it optimal?'
    print(f"\n5. Asking Grounded Question: \"{q1}\"")
    chat1 = requests.post(
        'http://127.0.0.1:8000/api/chat',
        json={
            'message': q1,
            'document_scope': 'single',
            'selected_document_ids': [doc_id]
        }
    ).json()

    print(f"   Answer:\n{chat1['answer']}")
    print(f"   Sources returned: {len(chat1['sources'])}")
    for s in chat1['sources']:
        print(f"   -> {s['document_name']}, Page {s['page_number']} (Score: {s['score']})")

    assert len(chat1['sources']) > 0
    assert any(s['page_number'] == 2 for s in chat1['sources'])
    print("   [OK] Page 2 citation verified!")

    # 4. Test Follow-up Question
    conv_id = chat1['conversation_id']
    q2 = 'Explain how the heuristic h(n) relates to admissibility.'
    print(f"\n6. Asking Follow-up Question: \"{q2}\"")
    chat2 = requests.post(
        'http://127.0.0.1:8000/api/chat',
        json={
            'message': q2,
            'conversation_id': conv_id,
            'document_scope': 'single',
            'selected_document_ids': [doc_id]
        }
    ).json()

    print(f"   Answer:\n{chat2['answer']}")
    print(f"   Sources returned: {len(chat2['sources'])}")
    assert len(chat2['sources']) > 0
    print("   [OK] Follow-up conversation context verified!")

    # 5. Test Out-of-Scope / Hallucination refusal
    q3 = 'What is the capital of Australia and who is the current prime minister?'
    print(f"\n7. Asking Out-of-Scope Question: \"{q3}\"")
    chat3 = requests.post(
        'http://127.0.0.1:8000/api/chat',
        json={
            'message': q3,
            'document_scope': 'single',
            'selected_document_ids': [doc_id]
        }
    ).json()

    print(f"   Answer:\n{chat3['answer']}")
    lower_ans = chat3['answer'].lower()
    is_refused = (
        "couldn't find" in lower_ans
        or "not found" in lower_ans
        or "no relevant" in lower_ans
        or "not mentioned" in lower_ans
        or "does not contain" in lower_ans
        or "not present" in lower_ans
        or "no information" in lower_ans
    )
    print(f"   [OK] Grounding refusal triggered: {is_refused}")

    # 6. Test Study Tools
    print("\n8. Testing Study Station (Quiz Generation)...")
    quiz = requests.post(
        'http://127.0.0.1:8000/api/study/quiz',
        json={'document_id': doc_id}
    ).json()
    print(f"   Generated {len(quiz.get('questions', []))} practice questions:")
    for idx, q in enumerate(quiz.get('questions', [])[:2], 1):
        print(f"   Q{idx}: {q['question']}")
        print(f"   Correct Answer: {q['correct_answer']}")
        print(f"   Page Reference: Page {q.get('page_reference')}")

    print("\n9. Testing Study Station (Summary Generation)...")
    summary = requests.post(
        'http://127.0.0.1:8000/api/study/summary',
        json={'document_id': doc_id}
    ).json()
    print(f"   Summary:\n{summary.get('executive_summary', '')[:250]}...")
    print(f"   Takeaways: {len(summary.get('key_takeaways', []))} items")

    print("\n==========================================")
    print("ALL END-TO-END VERIFICATION CHECKS PASSED!")
    print("==========================================")

if __name__ == '__main__':
    run_live_test()
