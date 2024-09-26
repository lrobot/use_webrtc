


function makeid(length:number=10):string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


// https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5

export class PromiseFifoQueue {
  queue:any[] = [];
  workingOnPromise = false;

  enqueue(promise: ()=>Promise<any>) {
    return new Promise((resolve, reject) => {
      this.queue.push
        this.queue.push({
            promise,
            resolve,
            reject,
        });
        this.dequeue();
    });
  }

dequeue() {
    if (this.workingOnPromise) {
      return false;
    }
    const item = this.queue.shift();
    if (!item) {
      return false;
    }
    try {
      this.workingOnPromise = true;
      item.promise().then((value:any) => {
          this.workingOnPromise = false;
          item.resolve(value);
          this.dequeue();
        })
        .catch((err:any) => {
          this.workingOnPromise = false;
          item.reject(err);
          this.dequeue();
        })
    } catch (err) {
      this.workingOnPromise = false;
      item.reject(err);
      this.dequeue();
    }
    return true;
  }
}


export class TaskQueue {
    queue:any[] = [];
    isProcessing = false;

  // 添加任务到队列中
  enqueue(task: ()=>Promise<any>) {
    this.queue.push(task);
    this.processQueue(); // 每次添加任务时尝试处理队列
  }

  // 处理队列中的任务
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return; // 如果正在处理或队列为空，直接返回

    this.isProcessing = true; // 标记为正在处理任务

    while (this.queue.length > 0) {
      const currentTask = this.queue.shift(); // 先进先出，取出第一个任务
      try {
        await currentTask(); // 等待任务完成
      } catch (error) {
        console.error("Task failed:", error);
      }
    }

    this.isProcessing = false; // 处理完成，标记为非处理状态
  }
}


export default {
    makeid,
}
