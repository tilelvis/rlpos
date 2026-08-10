// User model + role enum (port of lib/core/models/user.dart).

export const USER_ROLES = {
  admin: {
    label: 'Administrator',
    description: 'Full access: menu, users, settings, sales & reports.',
  },
  cashier: {
    label: 'Cashier',
    description: 'Runs sales: takes orders, accepts payment, prints receipts.',
  },
  waiter: {
    label: 'Waiter',
    description:
      'Takes orders on the floor and sends them to the cashier. No access to payments, receipts, or reports.',
  },
};

export class User {
  constructor({
    id,
    username,
    password,
    displayName,
    role,
    createdAt,
  }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.displayName = displayName;
    this.role = role;
    this.createdAt = createdAt;
  }

  get isAdmin() {
    return this.role === 'admin';
  }
  get isCashier() {
    return this.role === 'cashier';
  }
  get isWaiter() {
    return this.role === 'waiter';
  }

  // Whether this user can complete a sale themselves — take payment,
  // generate the receipt, and print it on the spot. All roles can.
  get canTakePayment() {
    return this.role === 'admin' || this.role === 'cashier' || this.role === 'waiter';
  }

  // Whether this user sees financial oversight views — Dashboard, Order
  // Log, Receipts history, Reports. Waiters don't.
  get canViewFinancials() {
    return this.role === 'admin' || this.role === 'cashier';
  }

  get roleLabel() {
    return USER_ROLES[this.role]?.label ?? this.role;
  }

  copyWith({ username, password, displayName, role } = {}) {
    return new User({
      id: this.id,
      username: username ?? this.username,
      password: password ?? this.password,
      displayName: displayName ?? this.displayName,
      role: role ?? this.role,
      createdAt: this.createdAt,
    });
  }

  toMap() {
    return {
      id: this.id,
      username: this.username,
      password: this.password,
      displayName: this.displayName,
      role: this.role,
      createdAt: this.createdAt,
    };
  }

  static fromMap(m) {
    return new User({
      id: m.id,
      username: m.username,
      password: m.password,
      displayName: m.displayName,
      role: m.role,
      createdAt: m.createdAt,
    });
  }
}
