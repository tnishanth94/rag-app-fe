import axios from 'axios';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  private apiUrl = 'http://localhost:8000/query';
  private abortController?: AbortController;

  async askQuestion(question: string, context: any[]) {
    try {
      if (this.abortController) {
        this.abortController.abort();
      }

      this.abortController = new AbortController();

      const response = await axios.post(
        this.apiUrl,
        { question, context },
        { signal: this.abortController.signal }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.warn('Request canceled:', error.message);
        return { text: 'Request was canceled.', images: [] };
      }
      console.error('Error fetching response:', error);
      return { text: 'Error communicating with the backend.', images: [] };
    }
  }

  async askQuestionStream(question: string, context: any[]) {
      try {
          if (this.abortController) {
              this.abortController.abort();
          }

          this.abortController = new AbortController();

          const response = await axios.post(
              this.apiUrl,
              { question, context },
              {
                  signal: this.abortController.signal,
                  responseType: 'stream'
              }
          );

          async function* streamChunks(stream: any) {
              for await (const chunk of stream) {
                  yield chunk.toString();
              }
          }

          return {
              data: streamChunks(response.data),
              source_info: response.data.source_info,
              images: response.data.images
          };

      } catch (error: any) {
          if (axios.isCancel(error)) {
              console.warn('Request canceled:', error.message);
              return { data: ['Request was canceled.'], source_info: [], images: [] };
          }
          console.error('Error fetching response:', error);
          return { data: ['Error communicating with the backend.'], source_info: [], images: [] };
      }
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }
}