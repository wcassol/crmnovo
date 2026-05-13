import { Tag as TagType } from '@/lib/types';

interface Props {
  tags: TagType[];
}

export function TagsLista({ tags }: Props) {
  if (tags.length === 0) {
    return <span className="text-xs text-muted-foreground">sem tags</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: t.cor }}
        >
          {t.nome}
        </span>
      ))}
    </div>
  );
}
