import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { deleteSubcontractor, listSubcontractors, type Subcontractor } from '@/lib/master-data-api'

const statusLabels: Record<Subcontractor['status'], string> = {
  active: '啟用',
  inactive: '停用',
  deleted: '已刪除'
}

export function SubcontractorsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [target, setTarget] = useState<Subcontractor | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['subcontractors'], queryFn: listSubcontractors })
  const deleteMutation = useMutation({
    mutationFn: deleteSubcontractor,
    onSuccess: async () => {
      setTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['subcontractors'] })
      toast.show('已刪除分判商')
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">分判商</h1>
            <p className="text-sm text-slate-600">管理分判商基本資料與狀態。</p>
          </div>
          <Button onClick={() => navigate('/subcontractors/new')}>新增分判商</Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          {isLoading ? <p className="p-6 text-slate-600">載入中...</p> : null}
          {isError ? <p className="p-6 text-red-600">載入分判商失敗</p> : null}
          {!isLoading && !isError && data?.data.length === 0 ? (
            <p className="p-6 text-slate-600">尚未有分判商紀錄，請點「新增分判商」。</p>
          ) : null}
          {data?.data.length ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">代碼</th>
                  <th className="px-4 py-3">名稱</th>
                  <th className="px-4 py-3">BR</th>
                  <th className="px-4 py-3">聯絡人</th>
                  <th className="px-4 py-3">電話</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.data.map((subcontractor) => (
                  <tr key={subcontractor.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{subcontractor.code}</td>
                    <td className="px-4 py-3">{subcontractor.nameZh}</td>
                    <td className="px-4 py-3">{subcontractor.brNo ?? '-'}</td>
                    <td className="px-4 py-3">{subcontractor.contactName ?? '-'}</td>
                    <td className="px-4 py-3">{subcontractor.contactPhone ?? '-'}</td>
                    <td className="px-4 py-3">{statusLabels[subcontractor.status]}</td>
                    <td className="space-x-2 px-4 py-3">
                      <Link className="text-blue-600 hover:underline" to={`/subcontractors/${subcontractor.id}`}>
                        編輯
                      </Link>
                      <button className="text-red-600 hover:underline" type="button" onClick={() => setTarget(subcontractor)}>
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      <Dialog open={target !== null}>
        <DialogContent>
          <h2 className="text-lg font-semibold">確認刪除分判商</h2>
          <p className="mt-2 text-sm text-slate-600">刪除後列表將不再顯示「{target?.nameZh}」。</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              取消
            </Button>
            <Button disabled={deleteMutation.isPending} onClick={() => target && deleteMutation.mutate(target.id)}>
              {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
