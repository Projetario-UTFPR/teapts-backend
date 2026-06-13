import { WatchedList } from "@/common/entities/watched-list";
import { Professional } from "@/modules/professional/entities/professional.aggregate";

describe("[Value Object] Watched List", () => {
  it("should correctly remove only the specified elements", () => {
    const watchedList = new WatchedList<Professional>([
      // professional 1
      Professional.createUnchecked({
        id: "1",
        accountId: "1",
        specialism: Professional.Specialism.Doctor,
      }),
      // professional 2
      Professional.createUnchecked({
        id: "2",
        accountId: "2",
        specialism: Professional.Specialism.Doctor,
      }),
      // professional 3
      Professional.createUnchecked({
        id: "3",
        accountId: "3",
        specialism: Professional.Specialism.Doctor,
      }),
    ]);

    // we're excluding only professional 3
    watchedList.update([
      // professional 1
      Professional.createUnchecked({
        id: "1",
        accountId: "1",
        specialism: Professional.Specialism.Doctor,
      }),
      // professional 2
      Professional.createUnchecked({
        id: "2",
        accountId: "2",
        specialism: Professional.Specialism.Doctor,
      }),
    ]);

    expect(watchedList.getRemoved().length, "it should have removed only one professional").toBe(1);
    expect(watchedList.getRemoved()[0].getId()).toBe("3");
    expect(watchedList.getInserted().length, "it should not have added any new professional").toBe(
      0,
    );
    expect(watchedList.getCurrent().length, "there should be only two professionals left").toBe(2);
  });

  it("should correctly track change history", () => {
    const watchedList = new WatchedList<number>([1, 2]);

    expect(watchedList.getCurrent()).toEqual(expect.arrayContaining([1, 2]));

    // added 3
    watchedList.update([1, 2, 3]);
    expect(watchedList.getInserted()).toEqual(expect.arrayContaining([3]));
    expect(watchedList.getInserted().length).toBe(1);
    expect(watchedList.getRemoved().length).toBe(0);
    expect(watchedList.getCurrent()).toEqual(expect.arrayContaining([1, 2, 3]));

    // removed 2
    watchedList.update([1, 3]);
    expect(
      watchedList.getInserted(),
      "it should not erase added elements due to further operations",
    ).toEqual(expect.arrayContaining([3]));
    expect(watchedList.getRemoved()).toEqual(expect.arrayContaining([2]));
    expect(watchedList.getRemoved().length).toBe(1);
    expect(watchedList.getCurrent()).toEqual(expect.arrayContaining([1, 3]));
    expect(watchedList.getCurrent().length).toBe(2);
  });
});
