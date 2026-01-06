// Security Monitoring for Credential Exposure Prevention
// Logs security events and monitors for potential credential leakage

export interface SecurityEvent {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
  source: string;
  userId?: string;
  sessionId?: string;
}

export interface SecurityAlert {
  eventType: string;
  threshold: number;
  windowMs: number;
  action: "log" | "alert" | "block";
}

export class SecurityMonitor {
  private static readonly ALERTS: SecurityAlert[] = [
    {
      eventType: "url_parameter_violation",
      threshold: 3,
      windowMs: 300000, // 5 minutes
      action: "alert",
    },
    {
      eventType: "credential_exposure_attempt",
      threshold: 1,
      windowMs: 60000, // 1 minute
      action: "block",
    },
    {
      eventType: "oauth_data_leakage",
      threshold: 1,
      windowMs: 60000,
      action: "alert",
    },
    {
      eventType: "auth_parameter_sanitization",
      threshold: 10,
      windowMs: 900000, // 15 minutes
      action: "log",
    },
  ];

  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  /**
   * Log a security event
   */
  static logEvent(event: Omit<SecurityEvent, "timestamp">): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to event log
    this.events.push(fullEvent);

    // Trim old events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Check for alert thresholds
    this.checkAlerts(fullEvent);

    // Log to console based on severity
    this.logToConsole(fullEvent);
  }

  /**
   * Log URL parameter safety violation
   */
  static logUrlParameterViolation(
    paramName: string,
    paramValue: string,
    context: Record<string, any> = {},
  ): void {
    this.logEvent({
      type: "url_parameter_violation",
      severity: "high",
      message: `Sensitive parameter detected in URL: ${paramName}`,
      metadata: {
        paramName,
        paramLength: paramValue.length,
        containsEmail: this.containsEmail(paramValue),
        containsPhone: this.containsPhone(paramValue),
        containsToken: this.containsToken(paramValue),
        ...context,
      },
      source: "ParameterSanitizer",
    });
  }

  /**
   * Log credential exposure attempt
   */
  static logCredentialExposure(
    method: string,
    exposedFields: string[],
    context: Record<string, any> = {},
  ): void {
    this.logEvent({
      type: "credential_exposure_attempt",
      severity: "critical",
      message: `Credential exposure prevented in ${method}`,
      metadata: {
        authMethod: method,
        exposedFields,
        fieldCount: exposedFields.length,
        ...context,
      },
      source: "AuthErrorHandler",
    });
  }

  /**
   * Log OAuth data leakage attempt
   */
  static logOAuthDataLeakage(
    provider: string,
    dataFields: string[],
    context: Record<string, any> = {},
  ): void {
    this.logEvent({
      type: "oauth_data_leakage",
      severity: "high",
      message: `OAuth data exposure prevented for ${provider}`,
      metadata: {
        provider,
        exposedFields: dataFields,
        fieldCount: dataFields.length,
        ...context,
      },
      source: "SecureOAuthTransfer",
    });
  }

  /**
   * Log successful parameter sanitization
   */
  static logParameterSanitization(
    originalCount: number,
    sanitizedCount: number,
    removedParams: string[],
  ): void {
    this.logEvent({
      type: "auth_parameter_sanitization",
      severity: "low",
      message: `URL parameters sanitized successfully`,
      metadata: {
        originalCount,
        sanitizedCount,
        removedCount: originalCount - sanitizedCount,
        removedParams,
      },
      source: "ParameterSanitizer",
    });
  }

  /**
   * Check if recent events exceed alert thresholds
   */
  private static checkAlerts(event: SecurityEvent): void {
    const relevantAlerts = this.ALERTS.filter((alert) =>
      alert.eventType === event.type
    );

    for (const alert of relevantAlerts) {
      const recentEvents = this.getRecentEvents(event.type, alert.windowMs);

      if (recentEvents.length >= alert.threshold) {
        this.triggerAlert(alert, recentEvents);
      }
    }
  }

  /**
   * Get recent events of a specific type within time window
   */
  private static getRecentEvents(
    eventType: string,
    windowMs: number,
  ): SecurityEvent[] {
    const cutoffTime = Date.now() - windowMs;
    return this.events.filter((event) =>
      event.type === eventType && event.timestamp >= cutoffTime
    );
  }

  /**
   * Trigger security alert
   */
  private static triggerAlert(
    alert: SecurityAlert,
    events: SecurityEvent[],
  ): void {
    const alertEvent: SecurityEvent = {
      type: "security_alert_triggered",
      severity: "critical",
      message:
        `Security alert: ${events.length} ${alert.eventType} events in ${alert.windowMs}ms`,
      metadata: {
        alertType: alert.eventType,
        threshold: alert.threshold,
        actualCount: events.length,
        windowMs: alert.windowMs,
        action: alert.action,
        recentEvents: events.slice(-5), // Last 5 events
      },
      source: "SecurityMonitor",
      timestamp: Date.now(),
    };

    // Log the alert
    this.logToConsole(alertEvent);

    // Take action based on alert configuration
    switch (alert.action) {
      case "block":
        console.error(
          "🚨 SECURITY BLOCK: Potential attack detected",
          alertEvent,
        );
        break;
      case "alert":
        console.warn("⚠️ SECURITY ALERT: Threshold exceeded", alertEvent);
        break;
      case "log":
        console.info("📊 Security monitoring: Pattern detected", alertEvent);
        break;
    }
  }

  /**
   * Log event to console with appropriate severity
   */
  private static logToConsole(event: SecurityEvent): void {
    const prefix = `[Security:${event.severity.toUpperCase()}]`;
    const message = `${prefix} ${event.message}`;

    switch (event.severity) {
      case "critical":
        console.error(message, event.metadata);
        break;
      case "high":
        console.warn(message, event.metadata);
        break;
      case "medium":
        console.info(message, event.metadata);
        break;
      case "low":
        console.debug(message, event.metadata);
        break;
    }
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentCritical: SecurityEvent[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;
    }

    const recentCritical = this.getRecentEvents(
      "credential_exposure_attempt",
      3600000,
    ) // Last hour
      .concat(this.getRecentEvents("oauth_data_leakage", 3600000))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentCritical,
    };
  }

  /**
   * Helper: Check if string contains email pattern
   */
  private static containsEmail(value: string): boolean {
    return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value);
  }

  /**
   * Helper: Check if string contains phone pattern
   */
  private static containsPhone(value: string): boolean {
    return /[\+]?[1-9][\d]{3,14}/.test(value.replace(/\D/g, ""));
  }

  /**
   * Helper: Check if string contains token pattern
   */
  private static containsToken(value: string): boolean {
    return value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value);
  }

  /**
   * Clear all security events (for testing)
   */
  static clearEvents(): void {
    this.events = [];
  }

  /**
   * Get all security events (for debugging)
   */
  static getAllEvents(): SecurityEvent[] {
    return [...this.events];
  }
}
