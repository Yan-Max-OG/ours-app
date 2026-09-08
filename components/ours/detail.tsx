'use client';
import { useState } from 'react';
import {
  Check,
  Lock,
  ExternalLink,
  Pencil,
  Trash2,
  Mail,
  MapPin,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useSpace } from '@/lib/ours/store';
import { day, safeUrl, type Entry, type Kind } from '@/lib/ours/types';
import { mayEdit } from '@/lib/ours/permissions';
import { haptic } from '@/lib/ours/telegram';
import { Panel, Photo } from './primitives';
export function Confirmation({
  open,
  title,
  text,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AlertDialogContent className="confirm-dialog">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{text}</AlertDialogDescription>
        {error && <p className="form-error">{error}</p>}
        <div className="button-row">
          <AlertDialogCancel onClick={onClose}>Keep it</AlertDialogCancel>
          <button
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              haptic('warning');
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'One moment…' : 'Yes, continue'}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function DetailSheet({
  kind,
  row,
  onClose,
  onEdit,
}: {
  kind: Kind;
  row: Entry;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { space, update, remove, add, notify } = useSpace();
  const latest = space.entries[kind].find((e) => e.id === row.id) ?? row;
  const [opened, setOpened] = useState(
    !['gratitudes', 'time_capsules'].includes(kind),
  );
  const [confirm, setConfirm] = useState(false);
  const own = latest.creator_id === space.user.id;
  const locked = Boolean(
    latest.unlock_at &&
    Date.parse(latest.unlock_at) > Date.now() &&
    (kind === 'time_capsules' || !own),
  );
  const canEdit = mayEdit(kind, latest, space.user.id);
  const location = String(
    latest.details.location ?? latest.details.address ?? '',
  );
  const checklist = (latest.details.checklist ?? []) as {
    text: string;
    done: boolean;
  }[];
  return (
    <>
      <Panel
        open
        onClose={onClose}
        title={locked ? 'A little patience.' : latest.title}
        description={
          locked
            ? 'Some things are worth waiting for.'
            : `${space.members.find((m) => m.id === latest.creator_id)?.first_name ?? 'Your person'} · ${latest.date ?? new Date(latest.created_at).toLocaleDateString('en', { month: 'long', day: 'numeric' })}`
        }
      >
        <div className={'detail-content ' + (opened ? 'revealed' : '')}>
          {locked ? (
            <div className="sealed-state">
              <Lock size={40} />
              <span className="eyebrow">OPEN IN</span>
              <strong>
                {Math.max(
                  1,
                  Math.ceil(
                    (Date.parse(latest.unlock_at!) - Date.now()) / 86400000,
                  ),
                )}
              </strong>
              <span className="eyebrow">DAYS</span>
              <p>{new Date(latest.unlock_at!).toLocaleString()}</p>
            </div>
          ) : !opened ? (
            <button
              className="envelope"
              onClick={() => {
                setOpened(true);
                haptic('success');
              }}
            >
              <Mail size={76} strokeWidth={0.7} />
              <span className="eyebrow">JUST FOR YOU</span>
              <p>Go on. Open it.</p>
            </button>
          ) : (
            <>
              <PhotoIf row={latest} />
              {['gratitudes', 'time_capsules', 'love_notes'].includes(kind) ? (
                <blockquote className="letter-body">
                  {latest.body || latest.title}
                  <span>
                    —{' '}
                    {
                      space.members.find((m) => m.id === latest.creator_id)
                        ?.first_name
                    }
                  </span>
                </blockquote>
              ) : (
                <p className="detail-body">{latest.body}</p>
              )}
              {location && (
                <p className="location-label">
                  <MapPin size={15} />
                  {location}
                </p>
              )}
              {safeUrl(latest.details.url) && (
                <a
                  className="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={safeUrl(latest.details.url)}
                >
                  Take a look <ExternalLink size={16} />
                </a>
              )}
              {kind === 'gratitudes' && (
                <div className="reactions">
                  {['♡', 'Thank you', 'Made my day'].map((r) => (
                    <button
                      key={r}
                      className={
                        latest.details.reaction === r ? 'selected' : ''
                      }
                      onClick={() =>
                        void update(
                          kind,
                          latest.id,
                          own
                            ? { details: { ...latest.details, reaction: r } }
                            : { reaction: r },
                        ).catch(() => {})
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {kind === 'tasks' &&
                checklist.map((c, i) => (
                  <button
                    className="checklist-row"
                    key={i}
                    onClick={() =>
                      void update(kind, latest.id, {
                        details: {
                          ...latest.details,
                          checklist: checklist.map((x, j) =>
                            j === i ? { ...x, done: !x.done } : x,
                          ),
                        },
                      }).catch(() => {})
                    }
                  >
                    <span className={'task-check ' + (c.done ? 'checked' : '')}>
                      {c.done && <Check size={13} />}
                    </span>
                    {c.text}
                  </button>
                ))}
              {['tasks', 'places', 'bucket_items'].includes(kind) && (
                <button
                  className="primary full"
                  onClick={async () => {
                    try {
                      const done = latest.status !== 'completed';
                      await update(kind, latest.id, {
                        status: done ? 'completed' : 'open',
                        details: {
                          ...latest.details,
                          completed_at: done ? new Date().toISOString() : null,
                          visited_at: kind === 'places' && done ? day() : null,
                        },
                      });
                      if (kind === 'bucket_items' && done) {
                        await add('memories', {
                          title: latest.title,
                          body: latest.body,
                          image: latest.image,
                          date: day(),
                          category: 'bucket list',
                        });
                        notify('A someday became a memory.');
                      } else
                        notify(
                          done ? 'A little moment, made.' : 'Back on our list.',
                        );
                    } catch {
                      /* Store displays errors. */
                    }
                  }}
                >
                  <Check size={17} />
                  {latest.status === 'completed'
                    ? 'Put it back on our list'
                    : kind === 'places'
                      ? 'We’ve been here'
                      : kind === 'bucket_items'
                        ? 'We did this. Make it a memory.'
                        : 'We got this done'}
                </button>
              )}
            </>
          )}
          {(!locked || own) && (
            <div className="detail-actions">
              {canEdit && (
                <button onClick={onEdit}>
                  <Pencil size={15} /> Edit
                </button>
              )}
              {own && (
                <button onClick={() => setConfirm(true)}>
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      </Panel>
      <Confirmation
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove this little piece?"
        text="This will remove it from your shared space. This action cannot be undone."
        onConfirm={async () => {
          await remove(kind, latest.id);
          onClose();
        }}
      />
    </>
  );
}
function PhotoIf({ row }: { row: Entry }) {
  return row.image ? (
    <Photo src={row.image} alt={row.title} className="detail-photo" />
  ) : null;
}
