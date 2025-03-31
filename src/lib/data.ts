// This file contains mock data for the website
// In a real application, this would be fetched from an API

// Solutions data with photorealistic images
export const solutionsData = [
  {
    id: 1,
    title: "Machine Learning Models",
    description: "Custom machine learning solutions for predictive analytics, recommendation systems, and process optimization.",
    icon: "Cpu",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    linkColor: "text-blue-600",
    linkHoverColor: "hover:text-blue-700",
    image: "ml.jpg"
  },
  {
    id: 2,
    title: "Computer Vision Systems",
    description: "Image and video analysis solutions for object detection, facial recognition, and visual quality control.",
    icon: "Eye",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    linkColor: "text-emerald-600",
    linkHoverColor: "hover:text-emerald-700",
    image: "cv.jpg"
  },
  {
    id: 3,
    title: "Natural Language Processing",
    description: "Text analysis, sentiment detection, and conversational AI systems for customer service and content analysis.",
    icon: "MessageSquare",
    color: "text-violet-600",
    bgColor: "bg-violet-500",
    linkColor: "text-violet-600",
    linkHoverColor: "hover:text-violet-700",
    image: "nlp.jpg"
  },
  {
    id: 4,
    title: "Deep Learning Systems",
    description: "Advanced neural networks for complex pattern recognition, anomaly detection, and autonomous decision-making.",
    icon: "BarChart3",
    color: "text-gray-600",
    bgColor: "bg-gray-700",
    linkColor: "text-gray-600",
    linkHoverColor: "hover:text-gray-800",
    image: "dl.jpg"
  }
];

// Case studies data with photorealistic images
export const caseStudiesData = [
  {
    id: 1,
    title: "Smart City Security Surveillance System",
    description: "We implemented a citywide computer vision system that helped reduce crime by 27% and improved emergency response times by 42% through real-time monitoring and analytics.",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    category: "Smart Cities",
    categoryColor: "text-blue-700",
    categoryBgColor: "bg-blue-100",
    stats: [
      {
        icon: "CheckCircle",
        text: "27% Crime Reduction",
        iconColor: "text-blue-500",
      },
      {
        icon: "Clock",
        text: "6 Month Implementation",
        iconColor: "text-blue-500",
      }
    ],
    ctaColor: "text-blue-600",
    ctaHoverColor: "hover:text-blue-700",
  },
  {
    id: 2,
    title: "Predictive Analytics for Patient Care Optimization",
    description: "Our machine learning system helped a healthcare provider predict patient readmission risks with 87% accuracy, reducing readmissions by 23%.",
    image: "https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    category: "Healthcare",
    categoryColor: "text-emerald-700",
    categoryBgColor: "bg-emerald-100",
    stats: [
      {
        icon: "CheckCircle",
        text: "23% Fewer Readmissions",
        iconColor: "text-emerald-500",
      },
      {
        icon: "Clock",
        text: "6 Month Development",
        iconColor: "text-emerald-500",
      }
    ],
    ctaColor: "text-emerald-600",
    ctaHoverColor: "hover:text-emerald-700",
  },
  {
    id: 3,
    title: "Fraud Detection for Financial Services",
    description: "Our AI system identified fraudulent transactions with 99.2% accuracy, saving a financial institution over $4.5M annually in fraud losses.",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    category: "Finance",
    categoryColor: "text-violet-700",
    categoryBgColor: "bg-violet-100",
    stats: [
      {
        icon: "CheckCircle",
        text: "99.2% Detection Accuracy",
        iconColor: "text-violet-500",
      },
      {
        icon: "Clock",
        text: "4 Month Deployment",
        iconColor: "text-violet-500",
      }
    ],
    ctaColor: "text-violet-600",
    ctaHoverColor: "hover:text-violet-700",
  },
  {
    id: 4,
    title: "AI Chatbot for Customer Service Automation",
    description: "We built a generative AI assistant that handles 78% of customer inquiries without human intervention, improving response time by 85% and customer satisfaction by 32%.",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    category: "Generative AI",
    categoryColor: "text-amber-700",
    categoryBgColor: "bg-amber-100",
    stats: [
      {
        icon: "CheckCircle",
        text: "85% Faster Response Time",
        iconColor: "text-amber-500",
      },
      {
        icon: "Clock",
        text: "2 Month Implementation",
        iconColor: "text-amber-500",
      }
    ],
    ctaColor: "text-amber-600",
    ctaHoverColor: "hover:text-amber-700",
  }
];

export const testimonialsData = [
  {
    id: 1,
    name: "Michael Rodriguez",
    position: "CTO",
    company: "TechVision Enterprises",
    location: "San Francisco, USA",
    imageSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Robles.AI's computer vision solution revolutionized our quality control process. Their team's expertise in AI and machine learning helped us implement a system that not only improved product quality but also generated significant cost savings."
  },
  {
    id: 2,
    name: "Sarah Chen",
    position: "Director of Innovation",
    company: "HealthPlus",
    location: "Boston, USA",
    imageSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "The predictive analytics solution developed by Robles.AI has transformed our approach to patient care. Their model's accuracy in predicting readmission risks has allowed us to implement preventive measures and significantly improve patient outcomes."
  },
  {
    id: 3,
    name: "David Johnson",
    position: "VP of Operations",
    company: "RetailMax",
    location: "Chicago, USA",
    imageSrc: "https://randomuser.me/api/portraits/men/46.jpg",
    text: "The NLP solution provided by Robles.AI has given us unprecedented insights into customer feedback. We're now able to understand sentiment trends and identify improvement opportunities that were previously hidden in thousands of customer comments."
  },
  {
    id: 4,
    name: "Jessica Martinez",
    position: "Head of Data Science",
    company: "GlobalFinance",
    location: "New York, USA",
    imageSrc: "https://randomuser.me/api/portraits/women/22.jpg",
    text: "Implementing Robles.AI's fraud detection system was a game-changer for our financial institution. The accuracy of the model and the speed at which it operates has significantly reduced our exposure to fraudulent activities."
  },
  {
    id: 5,
    name: "Robert Kim",
    position: "Manufacturing Director",
    company: "NextGen Electronics",
    location: "Seoul, South Korea",
    imageSrc: "https://randomuser.me/api/portraits/men/55.jpg",
    text: "The defect detection system we implemented with Robles.AI has paid for itself many times over. Our production line efficiency has increased by 40% while maintaining higher quality standards than ever before."
  },
  {
    id: 6,
    name: "Emily Walker",
    position: "Chief Digital Officer",
    company: "Urban Logistics",
    location: "Austin, USA",
    imageSrc: "https://randomuser.me/api/portraits/women/33.jpg",
    text: "The route optimization algorithm developed by Robles.AI has transformed our logistics operations. We've reduced fuel costs by 28% and improved delivery times by 35%, giving us a significant competitive advantage."
  },
  {
    id: 7,
    name: "James Wilson",
    position: "Research Director",
    company: "PharmaDev",
    location: "London, UK",
    imageSrc: "https://randomuser.me/api/portraits/men/62.jpg",
    text: "Robles.AI's machine learning algorithms helped us identify promising drug candidates much faster than traditional methods. Their team's expertise in both AI and biochemistry was invaluable to our research process."
  },
  {
    id: 8,
    name: "Sophia Garcia",
    position: "Customer Experience Lead",
    company: "TelecomOne",
    location: "Seattle, USA",
    imageSrc: "https://randomuser.me/api/portraits/women/29.jpg",
    text: "The implementation of Robles.AI's conversational AI system has revolutionized our customer service. We've seen a 60% reduction in wait times and a significant improvement in customer satisfaction scores."
  },
  {
    id: 9,
    name: "Daniel Lee",
    position: "Security Operations Manager",
    company: "SecureNet",
    location: "Toronto, Canada",
    imageSrc: "https://randomuser.me/api/portraits/men/76.jpg",
    text: "Robles.AI's anomaly detection system has significantly enhanced our cybersecurity posture. The system consistently identifies threats that our previous solutions missed, allowing for proactive mitigation."
  },
  {
    id: 10,
    name: "Amanda Taylor",
    position: "VP of Product",
    company: "SmartRetail",
    location: "Melbourne, Australia",
    imageSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    text: "Implementing Robles.AI's recommendation system increased our average order value by 32%. Their team worked closely with us to understand our customers and optimize the algorithm for our specific market."
  }
];

export const coursesData = [
  {
    id: 1,
    title: "PyTorch Deep Learning",
    description: "Master deep learning with PyTorch, covering neural networks architecture, optimization techniques, and deployment strategies.",
    image: "https://images.unsplash.com/photo-1617854818583-09e7f077a156?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "PyTorch",
    level: "Intermediate",
    duration: "10 Weeks",
    format: "Online & In-person",
    regularPrice: "$1,995",
    price: "$1,595",
    buttonBg: "bg-blue-500",
    buttonHoverBg: "hover:bg-blue-600",
  },
  {
    id: 2,
    title: "TensorFlow for Production",
    description: "Learn how to build, deploy, and maintain machine learning models in production environments using TensorFlow.",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "TensorFlow",
    level: "Advanced",
    duration: "12 Weeks",
    format: "Online & In-person",
    regularPrice: "$2,495",
    price: "$1,995",
    buttonBg: "bg-orange-500",
    buttonHoverBg: "hover:bg-orange-600",
  },
  {
    id: 3,
    title: "Hugging Face Transformers",
    description: "Discover how to leverage pre-trained language models for NLP tasks using the Hugging Face ecosystem.",
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Hugging Face",
    level: "Intermediate",
    duration: "8 Weeks",
    format: "Online & In-person",
    regularPrice: "$1,895",
    price: "$1,495",
    buttonBg: "bg-yellow-500",
    buttonHoverBg: "hover:bg-yellow-600",
  },
  {
    id: 4,
    title: "LangChain Development",
    description: "Build powerful AI applications by chaining together language models, prompts, and external tools using LangChain.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "LangChain",
    level: "Intermediate",
    duration: "6 Weeks",
    format: "Online & In-person",
    regularPrice: "$1,695",
    price: "$1,395",
    buttonBg: "bg-green-500",
    buttonHoverBg: "hover:bg-green-600",
  },
  {
    id: 5,
    title: "Generative AI with OpenAI",
    description: "Learn how to use OpenAI's APIs to build generative AI applications for text, images, and more.",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "Generative AI",
    level: "Beginner",
    duration: "8 Weeks",
    format: "Online & In-person",
    regularPrice: "$1,795",
    price: "$1,295",
    buttonBg: "bg-violet-500",
    buttonHoverBg: "hover:bg-violet-600",
  },
  {
    id: 6,
    title: "Computer Vision with PyTorch",
    description: "Master object detection, image segmentation, and video analysis using PyTorch's vision libraries.",
    image: "https://images.unsplash.com/photo-1527430253228-e93688616381?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    category: "PyTorch",
    level: "Advanced",
    duration: "12 Weeks",
    format: "Online & In-person",
    regularPrice: "$2,495",
    price: "$1,995",
    buttonBg: "bg-blue-500",
    buttonHoverBg: "hover:bg-blue-600",
  }
];

export const teamData = [
  {
    id: 1,
    name: "Dr. Antonio Robles",
    position: "Founder & CEO",
    positionColor: "text-blue-600",
    bio: "Former AI researcher with 15+ years of experience in developing machine learning applications for enterprise clients.",
    image: "ar.jpg"
  },
  {
    id: 2,
    name: "Dr. Jennifer Kim",
    position: "Chief Research Officer",
    positionColor: "text-emerald-600",
    bio: "Leading expert in computer vision with PhD from MIT and 20+ publications in top AI journals and conferences.",
    image: "jk.jpg"
  },
  {
    id: 3,
    name: "Michael Chen",
    position: "Chief Technology Officer",
    positionColor: "text-violet-600",
    bio: "Software architect with expertise in implementing scalable AI systems for enterprise clients across industries.",
    image: "mc.jpg"
  },
  {
    id: 4,
    name: "Dr. Sophia Martinez",
    position: "Director of AI Ethics",
    positionColor: "text-gray-700",
    bio: "Former professor with expertise in responsible AI development, ensuring ethical implementation of our solutions.",
    image: "sm.jpg"
  }
];
