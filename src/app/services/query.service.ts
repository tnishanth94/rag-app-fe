import axios from 'axios';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  private apiUrl = 'http://localhost:8000/query';
  private abortController?: AbortController;

  // async askQuestion(question: string) {
  //   try {
  //     if (this.abortController) {
  //       this.abortController.abort();
  //     }

  //     this.abortController = new AbortController();

  //     const response = await axios.post(
  //       this.apiUrl, 
  //       { question }, 
  //       { signal: this.abortController.signal }
  //     );

  //     return response.data;
  //   } catch (error: any) {
  //     if (axios.isCancel(error)) {
  //       console.warn('Request canceled:', error.message);
  //       return { text: 'Request was canceled.', images: [] };
  //     }
  //     console.error('Error fetching response:', error);
  //     return { text: 'Error communicating with the backend.', images: [] };
  //   }
  // }

  async askQuestion(question: string, context: any[]) {
    try {
      if (this.abortController) {
        this.abortController.abort();
      }
  
      this.abortController = new AbortController();
  
      const response = await axios.post(
        this.apiUrl, 
        { question, context },  // Send context messages too
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
  
  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }
}
