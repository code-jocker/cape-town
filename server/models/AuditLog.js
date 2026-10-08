import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'system' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/** Fire-and-forget audit write; never blocks or throws into request flow. */
export async function audit(actor, action, entity, entityId, before, after) {
  try {
    await AuditLog.create({
      actor: actor?.id || actor?._id || null,
      actorName: actor?.name || actor || 'system',
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      before,
      after
    });
  } catch {
    /* audit must never break the request */
  }
}
