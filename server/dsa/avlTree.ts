/**
 * Custom AVL Tree (Self-Balancing Binary Search Tree) Implementation
 * Adheres strictly to O(log n) Search, Insertion, and Deletion with O(1) Rotations.
 * Includes LL, RR, LR, RL Rotations, Inorder, Preorder, Postorder Traversals,
 * and Tree Visualizer Serialization.
 */

export interface AVLNodeData {
  key: string;
  value: any;
}

export class AVLNode<T = any> {
  key: string;
  value: T;
  left: AVLNode<T> | null = null;
  right: AVLNode<T> | null = null;
  height: number = 1;

  constructor(key: string, value: T) {
    this.key = key;
    this.value = value;
  }

  getBalanceFactor(): number {
    const leftHeight = this.left ? this.left.height : 0;
    const rightHeight = this.right ? this.right.height : 0;
    return leftHeight - rightHeight;
  }

  updateHeight(): void {
    const leftHeight = this.left ? this.left.height : 0;
    const rightHeight = this.right ? this.right.height : 0;
    this.height = 1 + Math.max(leftHeight, rightHeight);
  }
}

export class AVLTree<T = any> {
  root: AVLNode<T> | null = null;
  size: number = 0;
  treeName: string;
  keyName: string;

  constructor(treeName: string = "AVL Tree", keyName: string = "key") {
    this.treeName = treeName;
    this.keyName = keyName;
  }

  private getHeight(node: AVLNode<T> | null): number {
    return node ? node.height : 0;
  }

  private getBalance(node: AVLNode<T> | null): number {
    return node ? node.getBalanceFactor() : 0;
  }

  // Right Rotation (LL Case)
  private rightRotate(y: AVLNode<T>): AVLNode<T> {
    const x = y.left!;
    const T2 = x.right;

    // Perform rotation
    x.right = y;
    y.left = T2;

    // Update heights
    y.updateHeight();
    x.updateHeight();

    return x;
  }

  // Left Rotation (RR Case)
  private leftRotate(x: AVLNode<T>): AVLNode<T> {
    const y = x.right!;
    const T2 = y.left;

    // Perform rotation
    y.left = x;
    x.right = T2;

    // Update heights
    x.updateHeight();
    y.updateHeight();

    return y;
  }

  // Insert a key-value pair
  insert(key: string, value: T): void {
    const inserted = { val: false };
    this.root = this.insertNode(this.root, key, value, inserted);
    if (inserted.val) {
      this.size++;
    }
  }

  private insertNode(
    node: AVLNode<T> | null,
    key: string,
    value: T,
    inserted: { val: boolean }
  ): AVLNode<T> {
    // 1. Normal BST Insert
    if (!node) {
      inserted.val = true;
      return new AVLNode<T>(key, value);
    }

    if (key < node.key) {
      node.left = this.insertNode(node.left, key, value, inserted);
    } else if (key > node.key) {
      node.right = this.insertNode(node.right, key, value, inserted);
    } else {
      // Key already exists: update payload without incrementing count
      node.value = value;
      return node;
    }

    // 2. Update height of this ancestor node
    node.updateHeight();

    // 3. Get the balance factor of this ancestor node
    const balance = this.getBalance(node);

    // 4. Balance the tree if unbalance occurs:

    // Left Left Case (LL)
    if (balance > 1 && key < node.left!.key) {
      return this.rightRotate(node);
    }

    // Right Right Case (RR)
    if (balance < -1 && key > node.right!.key) {
      return this.leftRotate(node);
    }

    // Left Right Case (LR)
    if (balance > 1 && key > node.left!.key) {
      node.left = this.leftRotate(node.left!);
      return this.rightRotate(node);
    }

    // Right Left Case (RL)
    if (balance < -1 && key < node.right!.key) {
      node.right = this.rightRotate(node.right!);
      return this.leftRotate(node);
    }

    return node;
  }

  // Search by Key: O(log n)
  search(key: string): T | null {
    let current = this.root;
    while (current !== null) {
      if (key === current.key) {
        return current.value;
      } else if (key < current.key) {
        current = current.left;
      } else {
        current = current.right;
      }
    }
    return null;
  }

  // Search with traversal path (for UI visualization trace)
  searchWithTrace(key: string): { found: boolean; value: T | null; path: string[]; steps: number } {
    let current = this.root;
    const path: string[] = [];
    let steps = 0;

    while (current !== null) {
      steps++;
      path.push(current.key);
      if (key === current.key) {
        return { found: true, value: current.value, path, steps };
      } else if (key < current.key) {
        current = current.left;
      } else {
        current = current.right;
      }
    }
    return { found: false, value: null, path, steps };
  }

  // Find node with minimum key value in subtree
  private minValueNode(node: AVLNode<T>): AVLNode<T> {
    let current = node;
    while (current.left !== null) {
      current = current.left;
    }
    return current;
  }

  // Delete a key
  delete(key: string): boolean {
    const deleted = { val: false };
    this.root = this.deleteNode(this.root, key, deleted);
    if (deleted.val) {
      this.size--;
    }
    return deleted.val;
  }

  private deleteNode(
    root: AVLNode<T> | null,
    key: string,
    deleted: { val: boolean }
  ): AVLNode<T> | null {
    // 1. Standard BST delete
    if (!root) {
      return root;
    }

    if (key < root.key) {
      root.left = this.deleteNode(root.left, key, deleted);
    } else if (key > root.key) {
      root.right = this.deleteNode(root.right, key, deleted);
    } else {
      // Node with only one child or no child
      deleted.val = true;
      if (!root.left || !root.right) {
        const temp = root.left ? root.left : root.right;
        if (!temp) {
          root = null;
        } else {
          root = temp;
        }
      } else {
        // Node with two children: Get inorder successor (smallest in right subtree)
        const temp = this.minValueNode(root.right);
        root.key = temp.key;
        root.value = temp.value;
        // Delete the inorder successor
        root.right = this.deleteNode(root.right, temp.key, deleted);
      }
    }

    if (!root) {
      return null;
    }

    // 2. Update height
    root.updateHeight();

    // 3. Get balance factor
    const balance = this.getBalance(root);

    // 4. Rebalance

    // Left Left Case
    if (balance > 1 && this.getBalance(root.left) >= 0) {
      return this.rightRotate(root);
    }

    // Left Right Case
    if (balance > 1 && this.getBalance(root.left) < 0) {
      root.left = this.leftRotate(root.left!);
      return this.rightRotate(root);
    }

    // Right Right Case
    if (balance < -1 && this.getBalance(root.right) <= 0) {
      return this.leftRotate(root);
    }

    // Right Left Case
    if (balance < -1 && this.getBalance(root.right) > 0) {
      root.right = this.rightRotate(root.right!);
      return this.leftRotate(root);
    }

    return root;
  }

  // Traversals
  inorder(): T[] {
    const result: T[] = [];
    this.inorderHelper(this.root, result);
    return result;
  }

  private inorderHelper(node: AVLNode<T> | null, result: T[]): void {
    if (node) {
      this.inorderHelper(node.left, result);
      result.push(node.value);
      this.inorderHelper(node.right, result);
    }
  }

  inorderKeys(): string[] {
    const result: string[] = [];
    this.inorderKeysHelper(this.root, result);
    return result;
  }

  private inorderKeysHelper(node: AVLNode<T> | null, result: string[]): void {
    if (node) {
      this.inorderKeysHelper(node.left, result);
      result.push(node.key);
      this.inorderKeysHelper(node.right, result);
    }
  }

  preorder(): T[] {
    const result: T[] = [];
    this.preorderHelper(this.root, result);
    return result;
  }

  private preorderHelper(node: AVLNode<T> | null, result: T[]): void {
    if (node) {
      result.push(node.value);
      this.preorderHelper(node.left, result);
      this.preorderHelper(node.right, result);
    }
  }

  preorderKeys(): string[] {
    const result: string[] = [];
    this.preorderKeysHelper(this.root, result);
    return result;
  }

  private preorderKeysHelper(node: AVLNode<T> | null, result: string[]): void {
    if (node) {
      result.push(node.key);
      this.preorderKeysHelper(node.left, result);
      this.preorderKeysHelper(node.right, result);
    }
  }

  postorder(): T[] {
    const result: T[] = [];
    this.postorderHelper(this.root, result);
    return result;
  }

  private postorderHelper(node: AVLNode<T> | null, result: T[]): void {
    if (node) {
      this.postorderHelper(node.left, result);
      this.postorderHelper(node.right, result);
      result.push(node.value);
    }
  }

  postorderKeys(): string[] {
    const result: string[] = [];
    this.postorderKeysHelper(this.root, result);
    return result;
  }

  private postorderKeysHelper(node: AVLNode<T> | null, result: string[]): void {
    if (node) {
      this.postorderKeysHelper(node.left, result);
      this.postorderKeysHelper(node.right, result);
      result.push(node.key);
    }
  }

  // Clear the tree
  clear(): void {
    this.root = null;
    this.size = 0;
  }

  // Serialize tree structure for interactive visualization
  serializeForViz(): any {
    return {
      treeName: this.treeName,
      keyName: this.keyName,
      size: this.size,
      height: this.getHeight(this.root),
      root: this.serializeNode(this.root),
      traversals: {
        inorder: this.inorderKeys(),
        preorder: this.preorderKeys(),
        postorder: this.postorderKeys(),
      },
    };
  }

  private serializeNode(node: AVLNode<T> | null): any {
    if (!node) return null;
    return {
      key: node.key,
      height: node.height,
      balanceFactor: node.getBalanceFactor(),
      valuePreview: typeof node.value === "object" ? (node.value as any).name || (node.value as any).airline || (node.value as any).flightNumber || node.key : String(node.value),
      left: this.serializeNode(node.left),
      right: this.serializeNode(node.right),
    };
  }
}
