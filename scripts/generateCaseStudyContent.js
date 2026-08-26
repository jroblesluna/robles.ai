import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = {
  "smart-city": {
    en: `<h2>Smart City Security Surveillance System</h2>
<p class="meta">Client: A municipality in Lima, Peru | Duration: 6 months<br/>Technologies: Computer Vision, AI/ML, Edge Computing, Real-Time Alert Systems, Cloud Integration, REST APIs, IoT Cameras, Geospatial Mapping, React Native, FastAPI</p>

<h3>Executive Summary</h3>
<p>Robles.AI designed an AI-powered Smart Surveillance System for a municipality in Lima, Peru, aimed at reducing crime rates and improving emergency response times. This type of system can achieve up to a 27% reduction in crime and a 42% improvement in emergency response times through real-time monitoring, computer vision, and edge computing.</p>

<h3>Components &amp; Architecture</h3>
<ul>
<li><strong>Smart Cameras</strong>: Over 200 edge-powered HD cameras with computer vision capabilities deployed at key intersections, parks, and commercial areas.</li>
<li><strong>AI Engine</strong>: Real-time object detection, abnormal behavior recognition, and license plate tracking powered by YOLOv8 and OpenCV.</li>
<li><strong>Edge + Cloud</strong>: Local edge processors handle preliminary analysis; relevant data is sent to the cloud for archival and further analytics.</li>
<li><strong>Community App</strong>: React Native app enabling citizens to report incidents, access alerts, and provide feedback.</li>
<li><strong>Municipal Dashboard</strong>: Admin interface built with Next.js and Tailwind, visualizing incident heatmaps, trends, and alerts.</li>
<li><strong>Interoperability</strong>: REST APIs connecting the platform with existing alarm systems and emergency lines.</li>
</ul>

<h3>Project Stages</h3>
<ol>
<li><strong>Research &amp; Community Engagement</strong>
<ul>
<li>Conducted surveys with 2,000 residents</li>
<li>Gathered inputs from 12 neighborhood boards</li>
<li>Identified 37 key surveillance zones</li>
</ul>
</li>
<li><strong>Prototyping &amp; Validation</strong>
<ul>
<li>Deployed pilot in two high-traffic public spaces</li>
<li>System evaluated by local authorities over 4 weeks</li>
<li>Achieved 93% accuracy in detection of crowding, aggression, and trespassing</li>
</ul>
</li>
<li><strong>Deployment &amp; Integration</strong>
<ul>
<li>Scaled across the entire district with real-time streaming</li>
<li>Integrated with sirens, panic buttons, and legacy systems</li>
</ul>
</li>
<li><strong>Training &amp; Onboarding</strong>
<ul>
<li>Trained 34 municipal officers and 72 community volunteers</li>
<li>Onboarded 5,000+ residents onto the mobile app</li>
</ul>
</li>
</ol>

<h3>Results &amp; Impact</h3>
<ul>
<li><strong>Up to 27% crime reduction</strong> within six months of deployment</li>
<li><strong>Up to 42% faster emergency response</strong> through real-time alerts and geolocation</li>
<li><strong>89% community satisfaction</strong> based on follow-up surveys</li>
</ul>
<p>Residents in similar deployments report feeling safer in previously vulnerable zones. The mobile app enables swift communication and transparency between authorities and civilians. Neighborhood watch groups play a pivotal role by providing feedback and flagging technical anomalies.</p>
<p>This case exemplifies how AI-driven solutions can be tailored to meet the needs of local governments. With proper integration, training, and community collaboration, smart surveillance becomes a vital tool for building safer, more connected urban environments.</p>

<p class="disclaimer">This is an illustrative case study representing Robles.AI's methodology and typical outcomes.</p>`,

    es: `<h2>Sistema de Vigilancia Inteligente para Ciudades</h2>
<p class="meta">Cliente: Una municipalidad en Lima, Per\u00fa | Duraci\u00f3n: 6 meses<br/>Tecnolog\u00edas: Computer Vision, AI/ML, Edge Computing, Sistemas de Alerta en Tiempo Real, Integraci\u00f3n Cloud, REST APIs, C\u00e1maras IoT, Mapeo Geoespacial, React Native, FastAPI</p>

<h3>Resumen Ejecutivo</h3>
<p>Robles.AI dise\u00f1\u00f3 un Sistema de Vigilancia Inteligente con IA para una municipalidad en Lima, Per\u00fa, orientado a reducir la criminalidad y mejorar los tiempos de respuesta ante emergencias. Este tipo de sistema puede lograr hasta un 27% de reducci\u00f3n en delitos y una mejora del 42% en los tiempos de respuesta mediante monitoreo en tiempo real, visi\u00f3n computacional y edge computing.</p>

<h3>Componentes y Arquitectura</h3>
<ul>
<li><strong>C\u00e1maras Inteligentes</strong>: M\u00e1s de 200 c\u00e1maras HD con procesamiento en el borde y visi\u00f3n computacional, instaladas en intersecciones clave, parques y zonas comerciales.</li>
<li><strong>Motor de IA</strong>: Detecci\u00f3n de objetos en tiempo real, reconocimiento de conducta sospechosa y seguimiento de placas con YOLOv8 y OpenCV.</li>
<li><strong>Edge + Cloud</strong>: Procesadores locales analizan los datos preliminares; la informaci\u00f3n relevante se env\u00eda a la nube para almacenamiento y an\u00e1lisis.</li>
<li><strong>Aplicaci\u00f3n Comunitaria</strong>: App en React Native que permite a los ciudadanos recibir alertas, reportar incidentes y enviar comentarios.</li>
<li><strong>Panel Municipal</strong>: Interfaz administrativa desarrollada con Next.js y Tailwind con mapas de calor, tendencias y alertas.</li>
<li><strong>Interoperabilidad</strong>: APIs REST que conectan la plataforma con sistemas de alarmas y l\u00edneas de emergencia existentes.</li>
</ul>

<h3>Etapas del Proyecto</h3>
<ol>
<li><strong>Investigaci\u00f3n y Participaci\u00f3n Comunitaria</strong>
<ul>
<li>Se encuestaron a 2,000 residentes</li>
<li>12 juntas vecinales realizaron aportes</li>
<li>Se identificaron 37 zonas clave de vigilancia</li>
</ul>
</li>
<li><strong>Prototipado y Validaci\u00f3n</strong>
<ul>
<li>Piloto desplegado en dos espacios p\u00fablicos de alto tr\u00e1fico</li>
<li>Evaluaci\u00f3n del sistema por autoridades locales durante 4 semanas</li>
<li>Se alcanz\u00f3 un 93% de precisi\u00f3n en la detecci\u00f3n de aglomeraciones, agresiones e intrusiones</li>
</ul>
</li>
<li><strong>Despliegue e Integraci\u00f3n</strong>
<ul>
<li>Expansi\u00f3n a todo el distrito con transmisi\u00f3n en tiempo real</li>
<li>Integraci\u00f3n con sirenas, botones de p\u00e1nico y sistemas heredados</li>
</ul>
</li>
<li><strong>Capacitaci\u00f3n e Incorporaci\u00f3n</strong>
<ul>
<li>Se capacitaron a 34 agentes municipales y a 72 voluntarios de la comunidad</li>
<li>M\u00e1s de 5,000 residentes fueron incorporados a la app m\u00f3vil</li>
</ul>
</li>
</ol>

<h3>Resultados e Impacto</h3>
<ul>
<li><strong>Hasta 27% de reducci\u00f3n del crimen</strong> dentro de los seis meses de despliegue</li>
<li><strong>Hasta 42% de mejora en tiempos de respuesta</strong> mediante alertas y geolocalizaci\u00f3n en tiempo real</li>
<li><strong>89% de satisfacci\u00f3n ciudadana</strong> seg\u00fan encuestas de seguimiento</li>
</ul>
<p>Los residentes en despliegues similares reportan sentirse m\u00e1s seguros en zonas previamente vulnerables. La aplicaci\u00f3n m\u00f3vil permite una comunicaci\u00f3n \u00e1gil y transparente entre autoridades y ciudadanos. Los grupos de vigilancia vecinal juegan un rol clave al brindar retroalimentaci\u00f3n y reportar anomal\u00edas t\u00e9cnicas.</p>
<p>Este caso demuestra c\u00f3mo las soluciones de IA se adaptan a las necesidades de los gobiernos locales. Con una integraci\u00f3n adecuada, capacitaci\u00f3n y colaboraci\u00f3n comunitaria, la vigilancia inteligente se convierte en una herramienta vital para construir entornos urbanos m\u00e1s seguros y conectados.</p>

<p class="disclaimer">Este es un caso de estudio ilustrativo que representa la metodolog\u00eda y los resultados t\u00edpicos de Robles.AI.</p>`,
  },

  health: {
    en: `<h2>Predictive Analytics for Patient Care Optimization</h2>
<p class="meta">Client: A public hospital network in Mexico City | Duration: 6 months<br/>Technologies: Machine Learning, Predictive Analytics, Scikit-learn, XGBoost, Python, Google Cloud Platform (GCP), Vertex AI, BigQuery, React, TailwindCSS, Data Pipelines</p>

<h3>Executive Summary</h3>
<p>Robles.AI designed an artificial intelligence system focused on predictive analysis of patient readmission risk for a public hospital network in Mexico City. Systems of this type typically achieve around 87% accuracy in predicting readmissions and can lead to a 23% reduction in actual readmissions. This approach positions healthcare providers as leaders in AI-driven medical innovation.</p>

<h3>Components &amp; Architecture</h3>
<ul>
<li><strong>Data Source</strong>: Electronic health records, discharge summaries, diagnoses, treatments, age, comorbidities, and treatment adherence levels.</li>
<li><strong>AI Engine</strong>: Machine learning models developed with Scikit-learn and XGBoost, trained on 90,000 anonymized records.</li>
<li><strong>Processing Pipeline</strong>: Data cleaning, normalization, and variable encoding implemented in Python using Pandas and Scikit-learn.</li>
<li><strong>Cloud Platform</strong>: Infrastructure deployed on Google Cloud Platform (GCP) using Vertex AI and BigQuery.</li>
<li><strong>Clinical Dashboard</strong>: Web interface built with React and Tailwind displaying predictions, patient-specific explanations (SHAP values), and weekly reports.</li>
<li><strong>HL7/FHIR Integration</strong>: Bidirectional communication with hospital information systems (HIS).</li>
</ul>

<h3>Project Stages</h3>
<ol>
<li><strong>Data Exploration and Preparation</strong>
<ul>
<li>Data extracted and anonymized from 3 years of hospital discharges</li>
<li>Multiple public and private hospitals participated under ethical oversight</li>
</ul>
</li>
<li><strong>Model Validation</strong>
<ul>
<li>Dataset split into training and testing sets (80/20)</li>
<li>Final model achieved 87% accuracy (AUC = 0.91) and 82% recall on actual readmissions</li>
<li>Validated during a 4-week pilot at a participating hospital</li>
</ul>
</li>
<li><strong>Deployment and Integration</strong>
<ul>
<li>System integrated into the patient discharge workflow</li>
<li>Alerts generated for patients with a risk score over 70%</li>
<li>52 healthcare professionals trained to interpret the results</li>
</ul>
</li>
<li><strong>Community Adoption and Clinical Review</strong>
<ul>
<li>Personalized post-discharge follow-up strategies implemented</li>
<li>Medical committee conducted monthly reviews of the most relevant cases</li>
</ul>
</li>
</ol>

<h3>Results &amp; Impact</h3>
<ul>
<li><strong>Around 87% accuracy</strong> in predicting hospital readmission risk</li>
<li><strong>Up to 23% reduction in readmissions</strong> over the following six months</li>
<li><strong>94% clinical acceptance</strong> based on internal surveys of attending physicians</li>
<li><strong>Resource reallocation</strong>: fewer hospital beds occupied by recurrent cases</li>
</ul>
<p>This type of system improves clinical indicators while strengthening operational planning and enabling doctors to make better-informed decisions. The preventive approach promotes patient well-being by avoiding unnecessary hospitalizations. The model's interoperability with existing platforms facilitates adoption with minimal technological friction.</p>

<p class="disclaimer">This is an illustrative case study representing Robles.AI's methodology and typical outcomes.</p>`,

    es: `<h2>An\u00e1lisis Predictivo para Optimizar el Cuidado del Paciente</h2>
<p class="meta">Cliente: Una red hospitalaria p\u00fablica en Ciudad de M\u00e9xico | Duraci\u00f3n: 6 meses<br/>Tecnolog\u00edas: Machine Learning, Predictive Analytics, Scikit-learn, XGBoost, Python, Google Cloud Platform (GCP), Vertex AI, BigQuery, React, TailwindCSS, Data Pipelines</p>

<h3>Resumen Ejecutivo</h3>
<p>Robles.AI dise\u00f1\u00f3 un sistema de inteligencia artificial enfocado en el an\u00e1lisis predictivo del riesgo de reingreso de pacientes para una red hospitalaria p\u00fablica en Ciudad de M\u00e9xico. Sistemas de este tipo alcanzan t\u00edpicamente alrededor del 87% de precisi\u00f3n en la predicci\u00f3n de reingresos y pueden lograr una reducci\u00f3n del 23% en los mismos. Este enfoque posiciona a los proveedores de salud como l\u00edderes en innovaci\u00f3n m\u00e9dica basada en IA.</p>

<h3>Componentes y Arquitectura</h3>
<ul>
<li><strong>Fuente de Datos</strong>: Historias cl\u00ednicas electr\u00f3nicas, registros de egreso, diagn\u00f3sticos, tratamientos, edad, comorbilidades y niveles de adherencia a tratamiento.</li>
<li><strong>Motor de IA</strong>: Modelos de aprendizaje autom\u00e1tico desarrollados con Scikit-learn y XGBoost entrenados sobre 90,000 registros anonimizados.</li>
<li><strong>Pipeline de Procesamiento</strong>: Limpieza, normalizaci\u00f3n y codificaci\u00f3n de variables implementadas en Python con Pandas y Scikit-learn.</li>
<li><strong>Plataforma Cloud</strong>: Infraestructura desplegada sobre Google Cloud Platform (GCP) usando Vertex AI y BigQuery.</li>
<li><strong>Dashboard Cl\u00ednico</strong>: Interfaz web con React y Tailwind que muestra predicciones, explicaciones por paciente (SHAP values) y reportes semanales.</li>
<li><strong>Integraci\u00f3n HL7/FHIR</strong>: Comunicaci\u00f3n bidireccional con el sistema de gesti\u00f3n hospitalaria (HIS).</li>
</ul>

<h3>Etapas del Proyecto</h3>
<ol>
<li><strong>Exploraci\u00f3n y Preparaci\u00f3n de Datos</strong>
<ul>
<li>Se extrajeron y anonimizaron datos de los \u00faltimos 3 a\u00f1os de egresos hospitalarios</li>
<li>Participaron m\u00faltiples hospitales p\u00fablicos y privados con supervisi\u00f3n \u00e9tica</li>
</ul>
</li>
<li><strong>Validaci\u00f3n del Modelo</strong>
<ul>
<li>Se dividi\u00f3 el dataset en entrenamiento y testeo (80/20)</li>
<li>El modelo final logr\u00f3 un 87% de precisi\u00f3n (AUC = 0.91) y 82% de recall en reingresos reales</li>
<li>Se valid\u00f3 durante un piloto de 4 semanas en un hospital participante</li>
</ul>
</li>
<li><strong>Despliegue e Integraci\u00f3n</strong>
<ul>
<li>El sistema se integr\u00f3 al flujo de alta m\u00e9dica</li>
<li>Se generan alertas para pacientes con riesgo mayor al 70%</li>
<li>Se entrenaron a 52 profesionales de salud en la interpretaci\u00f3n de resultados</li>
</ul>
</li>
<li><strong>Adopci\u00f3n y Revisi\u00f3n Cl\u00ednica</strong>
<ul>
<li>Se generaron estrategias personalizadas de seguimiento post-alta</li>
<li>El comit\u00e9 m\u00e9dico revis\u00f3 mensualmente los casos m\u00e1s relevantes</li>
</ul>
</li>
</ol>

<h3>Resultados e Impacto</h3>
<ul>
<li><strong>Alrededor de 87% de precisi\u00f3n</strong> en predicci\u00f3n de riesgo de reingreso hospitalario</li>
<li><strong>Hasta 23% de reducci\u00f3n en readmisiones</strong> en el periodo de seis meses posteriores</li>
<li><strong>94% de aceptaci\u00f3n cl\u00ednica</strong> seg\u00fan encuesta interna a m\u00e9dicos tratantes</li>
<li><strong>Reasignaci\u00f3n de recursos</strong>: menos ocupaci\u00f3n de camas por casos reincidentes</li>
</ul>
<p>Este tipo de sistema mejora indicadores cl\u00ednicos mientras fortalece la planificaci\u00f3n operativa y permite a los m\u00e9dicos tomar decisiones m\u00e1s informadas. El enfoque preventivo favorece el bienestar de los pacientes al evitar hospitalizaciones innecesarias. La interoperabilidad del sistema con plataformas existentes facilita su adopci\u00f3n con m\u00ednima fricci\u00f3n tecnol\u00f3gica.</p>

<p class="disclaimer">Este es un caso de estudio ilustrativo que representa la metodolog\u00eda y los resultados t\u00edpicos de Robles.AI.</p>`,
  },

  finance: {
    en: `<h2>Fraud Detection for Financial Services</h2>
<p class="meta">Client: A financial institution in Latin America | Duration: 4 months<br/>Technologies: AI, Machine Learning, Anomaly Detection, Python, PyTorch, Scikit-learn, XGBoost, FastAPI, PostgreSQL, REST APIs, React, TailwindCSS, Docker, Azure Machine Learning</p>

<h3>Executive Summary</h3>
<p>Robles.AI designed an AI system capable of detecting fraudulent transactions in real-time for a financial institution in Latin America. This type of system can achieve up to 99.2% accuracy in fraud detection and generate potential savings of $4.5M annually in fraud-related losses. The approach has become a benchmark for the application of AI in the regional financial sector.</p>

<h3>Components &amp; Architecture</h3>
<ul>
<li><strong>Data Source</strong>: Transaction logs, user behavior history, geolocation, date and time, device fingerprinting, and historical fraud patterns.</li>
<li><strong>AI Engine</strong>: Ensemble ML models using XGBoost and neural networks trained on more than 6 million labeled transactions.</li>
<li><strong>Feature Engineering</strong>: Real-time feature generation (time windows, amount deviation, country mismatches) implemented in Python and PyTorch.</li>
<li><strong>Backend and APIs</strong>: Built with FastAPI, exposing REST endpoints for authorization and risk scoring.</li>
<li><strong>Real-Time Infrastructure</strong>: Deployed in Docker containers orchestrated on Azure Kubernetes Service (AKS) for scalable low-latency processing.</li>
<li><strong>Dashboard</strong>: React-based admin panel showing fraud heatmaps, alerts, and user behavior trends.</li>
</ul>

<h3>Project Stages</h3>
<ol>
<li><strong>Data Analysis and Preparation</strong>
<ul>
<li>Anonymized transactional records enriched with behavioral features</li>
<li>Domain experts labeled 250,000 transactions to train the initial model</li>
</ul>
</li>
<li><strong>Model Training and Testing</strong>
<ul>
<li>Cross-validation and hyperparameter tuning performed on Azure ML</li>
<li>Achieved 99.2% precision and 97% recall</li>
<li>Simulated in a shadow environment for 2 weeks before going live</li>
</ul>
</li>
<li><strong>Integration and Deployment</strong>
<ul>
<li>Integrated with the banking system's transaction processor</li>
<li>Risk scores trigger automated responses or alert a fraud analyst</li>
</ul>
</li>
<li><strong>Monitoring and Continuous Learning</strong>
<ul>
<li>Retrained monthly with new cases</li>
<li>Feedback loop from fraud analysts improves future detection</li>
</ul>
</li>
</ol>

<h3>Results &amp; Impact</h3>
<ul>
<li><strong>Up to 99.2% fraud detection accuracy</strong></li>
<li><strong>Potential savings of $4.5M+ annually</strong> by preventing fraudulent transactions</li>
<li><strong>Reduction in false positives by 36%</strong>, improving customer experience</li>
<li><strong>Response time under 300ms</strong>, enabling real-time decisions</li>
</ul>
<p>This type of implementation enables banks to act proactively against fraud attempts and reduce operational burdens on investigation teams. The high precision of the model minimizes disruptions for legitimate customers, while integration with internal dashboards enhances analyst decision-making. The explainability module based on SHAP values supports regulatory compliance and increases trust in automated systems.</p>

<p class="disclaimer">This is an illustrative case study representing Robles.AI's methodology and typical outcomes.</p>`,

    es: `<h2>Detecci\u00f3n de Fraude para Servicios Financieros</h2>
<p class="meta">Cliente: Una instituci\u00f3n financiera en Am\u00e9rica Latina | Duraci\u00f3n: 4 meses<br/>Tecnolog\u00edas: IA, Machine Learning, Detecci\u00f3n de Anomal\u00edas, Python, PyTorch, Scikit-learn, XGBoost, FastAPI, PostgreSQL, REST APIs, React, TailwindCSS, Docker, Azure Machine Learning</p>

<h3>Resumen Ejecutivo</h3>
<p>Robles.AI dise\u00f1\u00f3 un sistema de IA capaz de detectar transacciones fraudulentas en tiempo real para una instituci\u00f3n financiera en Am\u00e9rica Latina. Este tipo de sistema puede alcanzar hasta un 99.2% de precisi\u00f3n en la detecci\u00f3n de fraudes y generar ahorros potenciales de $4.5M anuales en p\u00e9rdidas relacionadas con fraudes. El enfoque se ha convertido en un referente para la aplicaci\u00f3n de IA en el sector financiero de la regi\u00f3n.</p>

<h3>Componentes y Arquitectura</h3>
<ul>
<li><strong>Fuente de Datos</strong>: Registros de transacciones, historial de comportamiento del usuario, geolocalizaci\u00f3n, fecha y hora, huella digital del dispositivo y patrones hist\u00f3ricos de fraude.</li>
<li><strong>Motor de IA</strong>: Modelos de conjunto ML usando XGBoost y redes neuronales entrenados con m\u00e1s de 6 millones de transacciones etiquetadas.</li>
<li><strong>Ingenier\u00eda de Caracter\u00edsticas</strong>: Generaci\u00f3n de variables en tiempo real (ventanas temporales, desviaci\u00f3n de montos, discrepancias de pa\u00eds) implementadas en Python y PyTorch.</li>
<li><strong>Backend y APIs</strong>: Construido con FastAPI, exponiendo endpoints REST para autorizaci\u00f3n y puntuaci\u00f3n de riesgo.</li>
<li><strong>Infraestructura en Tiempo Real</strong>: Desplegado en contenedores Docker orquestados con Azure Kubernetes Service (AKS) para procesamiento escalable de baja latencia.</li>
<li><strong>Dashboard</strong>: Panel administrativo basado en React con mapas de calor de fraude, alertas y tendencias de comportamiento.</li>
</ul>

<h3>Etapas del Proyecto</h3>
<ol>
<li><strong>An\u00e1lisis y Preparaci\u00f3n de Datos</strong>
<ul>
<li>Se anonimizaron registros transaccionales y se enriquecieron con variables de comportamiento</li>
<li>Expertos etiquetaron 250,000 transacciones para entrenar el modelo inicial</li>
</ul>
</li>
<li><strong>Entrenamiento y Pruebas del Modelo</strong>
<ul>
<li>Se realizaron validaciones cruzadas y ajuste de hiperpar\u00e1metros con Azure ML</li>
<li>Se logr\u00f3 una precisi\u00f3n de 99.2% y recall de 97%</li>
<li>Simulado durante 2 semanas en un entorno shadow antes del despliegue</li>
</ul>
</li>
<li><strong>Integraci\u00f3n y Despliegue</strong>
<ul>
<li>Se integr\u00f3 con el procesador de transacciones del sistema bancario</li>
<li>Las puntuaciones de riesgo activan respuestas autom\u00e1ticas o alertan a un analista de fraude</li>
</ul>
</li>
<li><strong>Monitoreo y Aprendizaje Continuo</strong>
<ul>
<li>Reentrenamiento mensual con nuevos casos</li>
<li>La retroalimentaci\u00f3n de los analistas de fraude mejora las futuras detecciones</li>
</ul>
</li>
</ol>

<h3>Resultados e Impacto</h3>
<ul>
<li><strong>Hasta 99.2% de precisi\u00f3n</strong> en detecci\u00f3n de fraudes</li>
<li><strong>Ahorro potencial de m\u00e1s de $4.5M anuales</strong> al prevenir transacciones fraudulentas</li>
<li><strong>36% de reducci\u00f3n de falsos positivos</strong>, mejorando la experiencia del cliente</li>
<li><strong>Tiempo de respuesta menor a 300ms</strong>, habilitando decisiones en tiempo real</li>
</ul>
<p>Este tipo de implementaci\u00f3n permite a los bancos actuar de forma proactiva frente a intentos de fraude y reducir la carga operativa de los equipos de investigaci\u00f3n. La precisi\u00f3n del modelo minimiza las interrupciones para clientes leg\u00edtimos, mientras que la integraci\u00f3n con dashboards fortalece la toma de decisiones. El m\u00f3dulo de explicabilidad basado en valores SHAP facilita el cumplimiento normativo y aumenta la confianza en los sistemas automatizados.</p>

<p class="disclaimer">Este es un caso de estudio ilustrativo que representa la metodolog\u00eda y los resultados t\u00edpicos de Robles.AI.</p>`,
  },

  telco: {
    en: `<h2>AI Chatbot for Customer Service Automation</h2>
<p class="meta">Client: A multinational telecommunications company | Duration: 2 months<br/>Technologies: Generative AI, LLMs, OpenAI GPT-4, LangChain, RAG, React, TailwindCSS, Node.js, FastAPI, Docker, Google Cloud Run, Dialogflow, Webhooks</p>

<h3>Executive Summary</h3>
<p>Robles.AI designed a Generative AI chatbot for a multinational telecommunications company capable of handling the majority of customer service inquiries. This type of system can autonomously resolve up to 78% of incoming requests, reduce response time by 85%, and improve customer satisfaction by 32%. This approach represents a transformative leap in scalable customer engagement solutions.</p>

<h3>Components &amp; Architecture</h3>
<ul>
<li><strong>Generative AI Core</strong>: Powered by OpenAI GPT-4 and enhanced via LangChain for prompt chaining and contextual memory.</li>
<li><strong>Knowledge Base Integration</strong>: Connected to internal documentation and FAQs through a RAG pipeline.</li>
<li><strong>Multichannel Interface</strong>: Integrated via web widget, WhatsApp Business API, and Facebook Messenger.</li>
<li><strong>Orchestration Layer</strong>: Node.js backend with FastAPI services handling session management, routing, and escalation.</li>
<li><strong>Deployment</strong>: Containerized with Docker and deployed to Google Cloud Run for elastic scalability.</li>
<li><strong>Monitoring and Feedback</strong>: Analytics dashboard built with React and Tailwind for tracking resolution rates, CSAT, and escalation rates.</li>
</ul>

<h3>Project Stages</h3>
<ol>
<li><strong>Discovery and Requirements</strong>
<ul>
<li>Interviewed customer support agents and reviewed historical tickets</li>
<li>Identified 12 most common user intents covering 78% of tickets</li>
</ul>
</li>
<li><strong>Model Integration and Prototyping</strong>
<ul>
<li>Fine-tuned prompts and memory buffers using LangChain</li>
<li>Built initial conversation flows and tested via Dialogflow simulator</li>
</ul>
</li>
<li><strong>Deployment and User Testing</strong>
<ul>
<li>Soft-launched on a limited user base</li>
<li>Collected feedback from 1,500+ sessions</li>
<li>Rolled out enterprise-wide after two weeks</li>
</ul>
</li>
<li><strong>Performance Monitoring and Iteration</strong>
<ul>
<li>Weekly prompt updates based on new intents</li>
<li>Added fallback handlers and escalation triggers</li>
</ul>
</li>
</ol>

<h3>Results &amp; Impact</h3>
<ul>
<li><strong>Up to 78% of inquiries</strong> resolved without human interaction</li>
<li><strong>85% faster average response time</strong></li>
<li><strong>32% increase in customer satisfaction</strong> (CSAT)</li>
<li><strong>Escalation rate decreased by 41%</strong></li>
</ul>
<p>AI chatbots of this type significantly reduce the workload on human agents, allowing them to focus on high-complexity cases. Customers experience shorter wait times and more consistent interactions. The solution also enables companies to scale support during promotional campaigns without adding headcount. The explainable AI module supports compliance with internal auditing and legal standards.</p>

<p class="disclaimer">This is an illustrative case study representing Robles.AI's methodology and typical outcomes.</p>`,

    es: `<h2>Chatbot de IA para Automatizaci\u00f3n del Servicio al Cliente</h2>
<p class="meta">Cliente: Una empresa multinacional de telecomunicaciones | Duraci\u00f3n: 2 meses<br/>Tecnolog\u00edas: IA Generativa, LLMs, OpenAI GPT-4, LangChain, RAG, React, TailwindCSS, Node.js, FastAPI, Docker, Google Cloud Run, Dialogflow, Webhooks</p>

<h3>Resumen Ejecutivo</h3>
<p>Robles.AI dise\u00f1\u00f3 un chatbot de IA Generativa para una empresa multinacional de telecomunicaciones capaz de gestionar la mayor\u00eda de consultas de servicio al cliente. Este tipo de sistema puede resolver aut\u00f3nomamente hasta el 78% de las solicitudes entrantes, reducir el tiempo de respuesta en un 85% y mejorar la satisfacci\u00f3n del cliente en un 32%. Este enfoque representa un avance transformador en soluciones escalables de atenci\u00f3n al cliente.</p>

<h3>Componentes y Arquitectura</h3>
<ul>
<li><strong>N\u00facleo de IA Generativa</strong>: Impulsado por OpenAI GPT-4 y mejorado mediante LangChain para encadenamiento de prompts y memoria contextual.</li>
<li><strong>Integraci\u00f3n con Base de Conocimiento</strong>: Conectado a la documentaci\u00f3n interna y preguntas frecuentes a trav\u00e9s de un pipeline RAG.</li>
<li><strong>Interfaz Multicanal</strong>: Integrado mediante widget web, API de WhatsApp Business y Facebook Messenger.</li>
<li><strong>Capa de Orquestaci\u00f3n</strong>: Backend en Node.js con servicios FastAPI para gesti\u00f3n de sesiones, enrutamiento y escalamiento.</li>
<li><strong>Despliegue</strong>: Contenerizado con Docker y desplegado en Google Cloud Run para escalabilidad el\u00e1stica.</li>
<li><strong>Monitoreo y Retroalimentaci\u00f3n</strong>: Panel de an\u00e1lisis construido con React y Tailwind para seguimiento de tasas de resoluci\u00f3n, CSAT y tasas de escalamiento.</li>
</ul>

<h3>Etapas del Proyecto</h3>
<ol>
<li><strong>Descubrimiento y Requisitos</strong>
<ul>
<li>Se entrevistaron agentes de soporte y se revisaron tickets hist\u00f3ricos</li>
<li>Se identificaron 12 intenciones de usuario comunes que cubr\u00edan el 78% de los tickets</li>
</ul>
</li>
<li><strong>Integraci\u00f3n del Modelo y Prototipado</strong>
<ul>
<li>Ajuste de prompts y buffers de memoria con LangChain</li>
<li>Construcci\u00f3n de flujos de conversaci\u00f3n iniciales y simulaci\u00f3n con Dialogflow</li>
</ul>
</li>
<li><strong>Despliegue y Pruebas de Usuario</strong>
<ul>
<li>Piloto con un subconjunto de usuarios</li>
<li>Recopilaci\u00f3n de retroalimentaci\u00f3n de m\u00e1s de 1,500 sesiones</li>
<li>Lanzamiento completo a nivel empresarial tras dos semanas</li>
</ul>
</li>
<li><strong>Monitoreo de Rendimiento e Iteraci\u00f3n</strong>
<ul>
<li>Actualizaci\u00f3n semanal de prompts basada en nuevas intenciones</li>
<li>Se a\u00f1adieron manejadores de fallos y disparadores de escalamiento</li>
</ul>
</li>
</ol>

<h3>Resultados e Impacto</h3>
<ul>
<li><strong>Hasta 78% de las consultas</strong> resueltas sin intervenci\u00f3n humana</li>
<li><strong>85% de reducci\u00f3n en el tiempo de respuesta</strong></li>
<li><strong>32% de incremento en la satisfacci\u00f3n del cliente</strong> (CSAT)</li>
<li><strong>Tasa de escalamiento reducida en 41%</strong></li>
</ul>
<p>Los chatbots de IA de este tipo reducen significativamente la carga de trabajo de los agentes humanos, permiti\u00e9ndoles enfocarse en casos de mayor complejidad. Los clientes experimentan tiempos de espera m\u00e1s cortos e interacciones m\u00e1s consistentes. La soluci\u00f3n tambi\u00e9n permite a las empresas escalar la atenci\u00f3n durante campa\u00f1as sin aumentar personal. El m\u00f3dulo de IA explicable facilita el cumplimiento de auditor\u00edas internas y est\u00e1ndares legales.</p>

<p class="disclaimer">Este es un caso de estudio ilustrativo que representa la metodolog\u00eda y los resultados t\u00edpicos de Robles.AI.</p>`,
  },
};

const outputPath = path.join(__dirname, "..", "public", "case-studies", "content.json");
fs.writeFileSync(outputPath, JSON.stringify(content, null, 2), "utf-8");
console.log(`Generated: ${outputPath}`);
