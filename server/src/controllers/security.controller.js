import securityService from '../services/security.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { category, severity, status, actor, search, startDate, endDate, page, limit } = req.query;

  const result = await securityService.listAuditLogs({
    organizationId: req.organizationId,
    category,
    severity,
    status,
    actor,
    search,
    startDate,
    endDate,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.logs,
    pagination: result.pagination
  });
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const { category, severity, status, startDate, endDate } = req.query;

  const csvData = await securityService.exportAuditLogsCsv({
    organizationId: req.organizationId,
    category,
    severity,
    status,
    startDate,
    endDate
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="tenantguard-audit-logs-${Date.now()}.csv"`);
  res.status(200).send(csvData);
});

export const getAlerts = asyncHandler(async (req, res) => {
  const { status, severity, page, limit } = req.query;

  const result = await securityService.listAlerts({
    organizationId: req.organizationId,
    status,
    severity,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.alerts,
    pagination: result.pagination
  });
});

export const updateAlertStatus = asyncHandler(async (req, res) => {
  const alert = await securityService.updateAlertStatus({
    organizationId: req.organizationId,
    alertId: req.params.id,
    newStatus: req.body.status,
    actor: req.user,
    req
  });

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ALERT_NOT_FOUND',
        message: 'The requested security alert was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: alert,
    message: `Alert status updated to ${req.body.status}.`
  });
});

export const getSecuritySummary = asyncHandler(async (req, res) => {
  const summary = await securityService.getSecuritySummary({
    organizationId: req.organizationId
  });

  res.status(200).json({
    success: true,
    data: summary
  });
});

export const updateMfaPolicy = asyncHandler(async (req, res) => {
  const { enforceMfa } = req.body;

  const organization = await securityService.updateMfaPolicy({
    organizationId: req.organizationId,
    enforceMfa,
    actor: req.user,
    req
  });

  res.status(200).json({
    success: true,
    data: organization,
    message: `Organization MFA enforcement policy set to ${enforceMfa ? 'REQUIRED' : 'OPTIONAL'}.`
  });
});

export const runIsolationTests = asyncHandler(async (req, res) => {
  const testReport = await securityService.runIsolationTests({
    actor: req.user,
    req
  });

  res.status(200).json({
    success: true,
    data: testReport,
    message: 'Live synthetic tenant isolation tests executed successfully.'
  });
});

export default {
  getAuditLogs,
  exportAuditLogs,
  getAlerts,
  updateAlertStatus,
  getSecuritySummary,
  updateMfaPolicy,
  runIsolationTests
};
