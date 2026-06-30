// LLM - Recipe parsing
export interface ParseRecipeRequest {
  input: string | { image_base64: string; mime_type: string };
  source: 'text' | 'image' | 'url' | 'voice';
}

export interface ParseRecipeResponse {
  name: string;
  ingredients: { name: string; amount: string }[];
  steps: {
    text: string;
    tag: 'instant' | 'wait_user' | 'wait_timer';
    duration_seconds?: number;
  }[];
}

// LLM - Temporary Q&A
export interface AskQuestionRequest {
  question: string;
  context: {
    recipe_name: string;
    current_step: { number: number; text: string; tag: string };
  };
}

export interface AskQuestionResponse {
  answer: string;
}

// TTS
export interface TTSRequest {
  text: string;
  voice_id?: string;
  stream?: boolean;
}

export interface TTSResponse {
  audio_base64?: string;
  audio_url?: string;
}

// Generic
export interface ApiError {
  code: string;
  message: string;
}
